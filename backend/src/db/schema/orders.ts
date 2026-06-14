import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  productName: text("product_name").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
