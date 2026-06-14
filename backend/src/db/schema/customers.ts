import { pgTable, serial, text, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  visitCount: integer("visit_count").notNull().default(0),
  lastPurchaseDate: date("last_purchase_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
