import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const decisionUsage = pgTable("decision_usage", {
  bucket: text("bucket").primaryKey(),
  used: integer("used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
export const insertDecisionUsageSchema = createInsertSchema(decisionUsage);
export type DecisionUsage = typeof decisionUsage.$inferSelect;
export type InsertDecisionUsage = typeof decisionUsage.$inferInsert;
