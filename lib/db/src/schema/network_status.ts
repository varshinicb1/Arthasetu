import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const networkStatusTable = pgTable("network_status", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("ONLINE"),
  updated_at: text("updated_at").notNull(),
});

export const insertNetworkStatusSchema = createInsertSchema(networkStatusTable);
export type InsertNetworkStatus = z.infer<typeof insertNetworkStatusSchema>;
export type NetworkStatus = typeof networkStatusTable.$inferSelect;
