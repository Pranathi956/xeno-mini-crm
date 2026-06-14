import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";
import { PreviewSegmentBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Allowed column identifiers for SQL WHERE injection safety
const ALLOWED_COLUMNS = ["total_spent", "visit_count", "last_purchase_date", "city", "totalSpent", "visitCount", "lastPurchaseDate"];

function sanitizeSegmentQuery(query: string): string {
  // Map camelCase field names to snake_case DB columns
  return query
    .replace(/\btotalSpent\b/g, "total_spent")
    .replace(/\bvisitCount\b/g, "visit_count")
    .replace(/\blastPurchaseDate\b/g, "last_purchase_date");
}

router.post("/segments/preview", async (req, res): Promise<void> => {
  const parsed = PreviewSegmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawQuery = parsed.data.segmentQuery;

  // Basic SQL injection prevention: only allow simple comparisons
  const forbidden = /\b(drop|delete|insert|update|alter|create|truncate|exec|execute|union|;)\b/i;
  if (forbidden.test(rawQuery)) {
    res.status(400).json({ error: "Invalid segment query" });
    return;
  }

  const sanitizedQuery = sanitizeSegmentQuery(rawQuery);

  try {
    const countResult = await db.execute(
      sql.raw(`SELECT COUNT(*)::int as count FROM customers WHERE ${sanitizedQuery}`)
    );
    const count = (countResult.rows[0] as { count: number }).count;

    const sampleResult = await db.execute(
      sql.raw(`SELECT * FROM customers WHERE ${sanitizedQuery} LIMIT 5`)
    );

    const sample = sampleResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      city: r.city,
      totalSpent: Number(r.total_spent),
      visitCount: r.visit_count,
      lastPurchaseDate: r.last_purchase_date ?? null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));

    res.json({ count, sample });
  } catch (err) {
    logger.error({ err }, "Segment query error");
    res.status(400).json({ error: "Invalid segment query syntax" });
  }
});

export default router;
