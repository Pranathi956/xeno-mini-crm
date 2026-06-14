import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable } from "../db/index.js";
import { ListCustomersQueryParams, BulkCreateCustomersBody, BulkCreateOrdersBody } from "../validators.js";
import { ilike, and, gte, lte, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const parsed = ListCustomersQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { search, city, minSpent, maxSpent } = parsed.data;
  const conditions = [];

  if (search) conditions.push(sql`(${ilike(customersTable.name, `%${search}%`)} OR ${ilike(customersTable.email, `%${search}%`)})`);
  if (city) conditions.push(ilike(customersTable.city, `%${city}%`));
  if (minSpent != null) conditions.push(gte(customersTable.totalSpent, String(minSpent)));
  if (maxSpent != null) conditions.push(lte(customersTable.totalSpent, String(maxSpent)));

  const customers = await db
    .select()
    .from(customersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(customersTable.createdAt);

  res.json(customers.map((c) => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, city: c.city,
    totalSpent: Number(c.totalSpent), visitCount: c.visitCount,
    lastPurchaseDate: c.lastPurchaseDate ?? null, createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/customers/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateCustomersBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { customers } = parsed.data;
  if (customers.length === 0) { res.status(201).json({ inserted: 0 }); return; }

  const inserted = await db.insert(customersTable).values(
    customers.map((c) => ({
      name: c.name, email: c.email, phone: c.phone, city: c.city,
      totalSpent: String(c.totalSpent ?? 0), visitCount: c.visitCount ?? 0,
      lastPurchaseDate: c.lastPurchaseDate ?? null,
    }))
  ).returning({ id: customersTable.id });

  res.status(201).json({ inserted: inserted.length });
});

router.post("/orders/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateOrdersBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { orders } = parsed.data;
  if (orders.length === 0) { res.status(201).json({ inserted: 0 }); return; }

  const inserted = await db.insert(ordersTable).values(
    orders.map((o) => ({ customerId: o.customerId, amount: String(o.amount), productName: o.productName, status: o.status }))
  ).returning({ id: ordersTable.id });

  for (const order of orders) {
    await db.update(customersTable).set({
      totalSpent: sql`${customersTable.totalSpent} + ${String(order.amount)}`,
      visitCount: sql`${customersTable.visitCount} + 1`,
    }).where(eq(customersTable.id, order.customerId));
  }

  res.status(201).json({ inserted: inserted.length });
});

export default router;
