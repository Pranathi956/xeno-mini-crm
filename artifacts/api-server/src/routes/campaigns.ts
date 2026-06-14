import { Router, type IRouter } from "express";
import { db, campaignsTable, communicationsTable, campaignStatsTable, customersTable } from "@workspace/db";
import {
  CreateCampaignBody,
  GetCampaignParams,
  SendCampaignParams,
  GetCampaignStatsParams,
} from "@workspace/api-zod";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function sanitizeSegmentQuery(query: string): string {
  return query
    .replace(/\btotalSpent\b/g, "total_spent")
    .replace(/\bvisitCount\b/g, "visit_count")
    .replace(/\blastPurchaseDate\b/g, "last_purchase_date");
}

async function getStatsForCampaign(campaignId: number) {
  const [stats] = await db
    .select()
    .from(campaignStatsTable)
    .where(eq(campaignStatsTable.campaignId, campaignId));
  return stats ?? { campaignId, totalSent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };
}

function formatCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    segmentQuery: c.segmentQuery,
    message: c.message,
    channel: c.channel,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    sentByAi: c.sentByAi,
  };
}

router.get("/campaigns", async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .orderBy(sql`${campaignsTable.createdAt} desc`);

  const campaignIds = campaigns.map((c) => c.id);
  let statsMap: Record<number, { campaignId: number; totalSent: number; delivered: number; failed: number; opened: number; clicked: number }> = {};

  if (campaignIds.length > 0) {
    const stats = await db
      .select()
      .from(campaignStatsTable)
      .where(sql`campaign_id = ANY(ARRAY[${sql.join(campaignIds.map(id => sql`${id}`), sql`, `)}]::int[])`);

    for (const s of stats) {
      statsMap[s.campaignId] = {
        campaignId: s.campaignId,
        totalSent: s.totalSent,
        delivered: s.delivered,
        failed: s.failed,
        opened: s.opened,
        clicked: s.clicked,
      };
    }
  }

  const result = campaigns.map((c) => ({
    ...formatCampaign(c),
    stats: statsMap[c.id] ?? { campaignId: c.id, totalSent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 },
  }));

  res.json(result);
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, segmentQuery, message, channel, sentByAi } = parsed.data;

  const [campaign] = await db
    .insert(campaignsTable)
    .values({ name, segmentQuery, message, channel, sentByAi: sentByAi ?? false, status: "draft" })
    .returning();

  res.status(201).json(formatCampaign(campaign!));
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const stats = await getStatsForCampaign(campaign.id);
  res.json({ ...formatCampaign(campaign), stats });
});

router.post("/campaigns/:id/send", async (req, res): Promise<void> => {
  const params = SendCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // Query customers matching the segment
  const forbidden = /\b(drop|delete|insert|update|alter|create|truncate|exec|execute|union|;)\b/i;
  const sanitized = sanitizeSegmentQuery(campaign.segmentQuery);

  let customers: Array<typeof customersTable.$inferSelect> = [];
  if (!forbidden.test(campaign.segmentQuery)) {
    try {
      const result = await db.execute(
        sql.raw(`SELECT * FROM customers WHERE ${sanitized}`)
      );
      customers = result.rows as Array<typeof customersTable.$inferSelect>;
    } catch (err) {
      logger.error({ err }, "Failed to query segment customers");
      customers = [];
    }
  }

  if (customers.length === 0) {
    // Fallback: send to all customers
    customers = await db.select().from(customersTable);
  }

  // Create communication records
  const commInserts = customers.map((c) => ({
    campaignId: campaign.id,
    customerId: (c as unknown as { id: number }).id,
    message: campaign.message,
    channel: campaign.channel,
    status: "pending" as const,
  }));

  const communications = await db
    .insert(communicationsTable)
    .values(commInserts)
    .returning();

  // Upsert campaign_stats with total_sent
  await db
    .insert(campaignStatsTable)
    .values({ campaignId: campaign.id, totalSent: communications.length })
    .onConflictDoUpdate({
      target: campaignStatsTable.campaignId,
      set: { totalSent: communications.length },
    });

  // Update campaign status to sent
  await db
    .update(campaignsTable)
    .set({ status: "sent" })
    .where(eq(campaignsTable.id, campaign.id));

  // Fire-and-forget: simulate channel delivery async
  simulateDelivery(campaign.id, communications).catch((err) => {
    logger.error({ err }, "Simulate delivery error");
  });

  res.json({ message: "Campaign send initiated", queued: communications.length });
});

router.get("/campaigns/:id/stats", async (req, res): Promise<void> => {
  const params = GetCampaignStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const stats = await getStatsForCampaign(params.data.id);
  res.json(stats);
});

// Simulate channel delivery (mimics channel service behavior)
async function simulateDelivery(
  campaignId: number,
  communications: Array<typeof communicationsTable.$inferSelect>
) {
  for (const comm of communications) {
    // Stagger delivery to avoid thundering herd
    const delay = Math.floor(Math.random() * 3000) + 1000;
    setTimeout(async () => {
      try {
        const isDelivered = Math.random() < 0.8;
        const newStatus = isDelivered ? "delivered" : "failed";

        await db
          .update(communicationsTable)
          .set({ status: newStatus })
          .where(eq(communicationsTable.id, comm.id));

        if (isDelivered) {
          await db
            .update(campaignStatsTable)
            .set({ delivered: sql`delivered + 1` })
            .where(eq(campaignStatsTable.campaignId, campaignId));

          // Simulate opened
          setTimeout(async () => {
            if (Math.random() < 0.6) {
              await db
                .update(communicationsTable)
                .set({ status: "opened" })
                .where(eq(communicationsTable.id, comm.id));

              await db
                .update(campaignStatsTable)
                .set({ opened: sql`opened + 1` })
                .where(eq(campaignStatsTable.campaignId, campaignId));

              // Simulate clicked
              setTimeout(async () => {
                if (Math.random() < 0.4) {
                  await db
                    .update(communicationsTable)
                    .set({ status: "clicked" })
                    .where(eq(communicationsTable.id, comm.id));

                  await db
                    .update(campaignStatsTable)
                    .set({ clicked: sql`clicked + 1` })
                    .where(eq(campaignStatsTable.campaignId, campaignId));
                }
              }, 2000 + Math.random() * 2000);
            }
          }, 3000 + Math.random() * 2000);
        } else {
          await db
            .update(campaignStatsTable)
            .set({ failed: sql`failed + 1` })
            .where(eq(campaignStatsTable.campaignId, campaignId));
        }
      } catch (err) {
        logger.error({ err, commId: comm.id }, "Delivery simulation error");
      }
    }, delay);
  }
}

export default router;
