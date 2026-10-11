import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const decisionTickets = pgTable("decision_tickets", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  credential: text("credential").notNull(),
  promptHash: text("prompt_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const insertDecisionTicketSchema = createInsertSchema(decisionTickets);
export type DecisionTicket = typeof decisionTickets.$inferSelect;
export type InsertDecisionTicket = typeof decisionTickets.$inferInsert;
