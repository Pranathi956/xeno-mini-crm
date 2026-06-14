import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable, campaignsTable, campaignStatsTable } from "../db/index.js";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);
  const [orderStats] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<string>`coalesce(sum(amount), 0)` }).from(ordersTable);
  const [campaignCount] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignsTable);
  const statsAgg = await db.select({ totalSent: sql<number>`coalesce(sum(total_sent), 0)::int`, delivered: sql<number>`coalesce(sum(delivered), 0)::int` }).from(campaignStatsTable);

  const totalSent = statsAgg[0]?.totalSent ?? 0;
  const delivered = statsAgg[0]?.delivered ?? 0;
  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;

  const recentCampaigns = await db.select().from(campaignsTable).orderBy(sql`${campaignsTable.createdAt} desc`).limit(5);
  const campaignIds = recentCampaigns.map((c) => c.id);
  let statsMap: Record<number, { totalSent: number; delivered: number; failed: number; opened: number; clicked: number }> = {};

  if (campaignIds.length > 0) {
    const stats = await db.select().from(campaignStatsTable).where(sql`campaign_id = ANY(${sql.raw(`ARRAY[${campaignIds.join(",")}]`)})`);
    for (const s of stats) statsMap[s.campaignId] = { totalSent: s.totalSent, delivered: s.delivered, failed: s.failed, opened: s.opened, clicked: s.clicked };
  }

  res.json({
    totalCustomers: customerCount?.count ?? 0,
    totalOrders: orderStats?.count ?? 0,
    totalRevenue: Number(orderStats?.revenue ?? 0),
    totalCampaigns: campaignCount?.count ?? 0,
    deliveryRate,
    recentCampaigns: recentCampaigns.map((c) => ({
      id: c.id, name: c.name, segmentQuery: c.segmentQuery, message: c.message,
      channel: c.channel, status: c.status, createdAt: c.createdAt.toISOString(),
      sentByAi: c.sentByAi, stats: statsMap[c.id] ?? { campaignId: c.id, totalSent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 },
    })),
  });
});

export default router;
