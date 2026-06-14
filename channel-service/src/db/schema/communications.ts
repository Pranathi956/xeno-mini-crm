import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  customerId: integer("customer_id").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
