import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logsTable = pgTable("logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull().default("INFO"),
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(),
  txn_id: text("txn_id"),
});

export const insertLogSchema = createInsertSchema(logsTable);
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logsTable.$inferSelect;
