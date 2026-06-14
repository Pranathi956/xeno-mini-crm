import { pgTable, integer } from "drizzle-orm/pg-core";

export const campaignStatsTable = pgTable("campaign_stats", {
  campaignId: integer("campaign_id").notNull().primaryKey(),
  totalSent: integer("total_sent").notNull().default(0),
  delivered: integer("delivered").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  opened: integer("opened").notNull().default(0),
  clicked: integer("clicked").notNull().default(0),
});
