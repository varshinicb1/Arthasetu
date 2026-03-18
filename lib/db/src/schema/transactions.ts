import { pgTable, text, numeric, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface ScoreBreakdownItem {
  label: string;
  delta: number;
  reason: string;
}

export const transactionsTable = pgTable("transactions", {
  txn_id: text("txn_id").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  customer_id: text("customer_id").notNull(),
  customer_name: text("customer_name").notNull(),
  merchant_id: text("merchant_id").notNull(),
  merchant_name: text("merchant_name").notNull(),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull().default("PENDING"),
  signature: text("signature").notNull(),
  proof_strength: text("proof_strength").notNull().default("MEDIUM"),
  confidence_score: numeric("confidence_score", { precision: 5, scale: 2 }).notNull().default("50"),
  confidence_level: text("confidence_level").notNull().default("MEDIUM"),
  merchant_decision: text("merchant_decision").notNull().default("PENDING"),
  fraud_flags: json("fraud_flags").$type<string[]>().notNull().default([]),
  score_breakdown: json("score_breakdown").$type<ScoreBreakdownItem[]>().notNull().default([]),
  network_mode: text("network_mode").notNull().default("ONLINE"),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable);
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
