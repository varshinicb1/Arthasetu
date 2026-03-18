import { pgTable, text, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  customer_id: text("customer_id").primaryKey(),
  customer_name: text("customer_name").notNull().default("Unknown"),
  success_count: integer("success_count").notNull().default(0),
  failed_count: integer("failed_count").notNull().default(0),
  fraud_count: integer("fraud_count").notNull().default(0),
  total_transactions: integer("total_transactions").notNull().default(0),
  avg_amount: numeric("avg_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  reliability_score: numeric("reliability_score", { precision: 5, scale: 2 }).notNull().default("50"),
  last_updated: text("last_updated").notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable);
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
