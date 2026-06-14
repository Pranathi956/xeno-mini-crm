import { Router, type IRouter } from "express";
import { db, communicationsTable, campaignStatsTable } from "@workspace/db";
import { CreateReceiptBody } from "@workspace/api-zod";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/receipts", async (req, res): Promise<void> => {
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { communicationId, status } = parsed.data;

  const [comm] = await db
    .select()
    .from(communicationsTable)
    .where(eq(communicationsTable.id, communicationId));

  if (!comm) {
    res.status(404).json({ error: "Communication not found" });
    return;
  }

  await db
    .update(communicationsTable)
    .set({ status })
    .where(eq(communicationsTable.id, communicationId));

  // Update campaign stats based on status
  const campaignId = comm.campaignId;
  try {
    if (status === "delivered") {
      await db
        .update(campaignStatsTable)
        .set({ delivered: sql`delivered + 1` })
        .where(eq(campaignStatsTable.campaignId, campaignId));
    } else if (status === "failed") {
      await db
        .update(campaignStatsTable)
        .set({ failed: sql`failed + 1` })
        .where(eq(campaignStatsTable.campaignId, campaignId));
    } else if (status === "opened") {
      await db
        .update(campaignStatsTable)
        .set({ opened: sql`opened + 1` })
        .where(eq(campaignStatsTable.campaignId, campaignId));
    } else if (status === "clicked") {
      await db
        .update(campaignStatsTable)
        .set({ clicked: sql`clicked + 1` })
        .where(eq(campaignStatsTable.campaignId, campaignId));
    }
  } catch (err) {
    logger.error({ err }, "Failed to update campaign stats from receipt");
  }

  res.json({ ok: true });
});

export default router;
