import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  segmentQuery: text("segment_query").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  status: text("status").notNull().default("draft"),
  sentByAi: boolean("sent_by_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
