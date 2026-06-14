import { Router, type IRouter } from "express";
import { db, communicationsTable, campaignStatsTable } from "../db/index.js";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

type CommRow = {
  id: number;
  campaignId: number;
  customerId: number;
  message: string;
  channel: string;
  status: string;
};

router.post("/deliver", (req, res): void => {
  const { campaignId, communications } = req.body as { campaignId: number; communications: CommRow[] };

  if (!campaignId || !Array.isArray(communications)) {
    res.status(400).json({ error: "campaignId and communications array required" });
    return;
  }

  // Fire-and-forget delivery simulation
  simulateDelivery(campaignId, communications).catch((err) =>
    logger.error({ err }, "Delivery simulation error")
  );

  res.json({ accepted: communications.length });
});

async function simulateDelivery(campaignId: number, communications: CommRow[]) {
  for (const comm of communications) {
    const delay = Math.floor(Math.random() * 3000) + 1000;

    setTimeout(async () => {
      try {
        const isDelivered = Math.random() < 0.8;
        const newStatus = isDelivered ? "delivered" : "failed";

        await db.update(communicationsTable).set({ status: newStatus }).where(eq(communicationsTable.id, comm.id));

        if (isDelivered) {
          await db.update(campaignStatsTable).set({ delivered: sql`delivered + 1` }).where(eq(campaignStatsTable.campaignId, campaignId));

          setTimeout(async () => {
            if (Math.random() < 0.6) {
              await db.update(communicationsTable).set({ status: "opened" }).where(eq(communicationsTable.id, comm.id));
              await db.update(campaignStatsTable).set({ opened: sql`opened + 1` }).where(eq(campaignStatsTable.campaignId, campaignId));

              setTimeout(async () => {
                if (Math.random() < 0.4) {
                  await db.update(communicationsTable).set({ status: "clicked" }).where(eq(communicationsTable.id, comm.id));
                  await db.update(campaignStatsTable).set({ clicked: sql`clicked + 1` }).where(eq(campaignStatsTable.campaignId, campaignId));
                }
              }, 2000 + Math.random() * 2000);
            }
          }, 3000 + Math.random() * 2000);
        } else {
          await db.update(campaignStatsTable).set({ failed: sql`failed + 1` }).where(eq(campaignStatsTable.campaignId, campaignId));
        }
      } catch (err) {
        logger.error({ err, commId: comm.id }, "Individual delivery error");
      }
    }, delay);
  }
}

export default router;
