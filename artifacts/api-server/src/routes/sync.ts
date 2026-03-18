import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, networkStatusTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { addLog } from "../lib/logger";
import { upsertUserProfile } from "../lib/scoring";
import { SyncTransactionsBody } from "@workspace/api-zod";

const router = Router();

function serializeTransaction(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    amount: Number(t.amount),
    confidence_score: Number(t.confidence_score),
    fraud_flags: Array.isArray(t.fraud_flags) ? t.fraud_flags : [],
    score_breakdown: Array.isArray(t.score_breakdown) ? t.score_breakdown : [],
  };
}

// POST /api/sync
router.post("/", async (req, res) => {
  const parseResult = SyncTransactionsBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parseResult.error.message });
    return;
  }

  // Get current network mode
  const statusRows = await db
    .select()
    .from(networkStatusTable)
    .orderBy(desc(networkStatusTable.id))
    .limit(1);
  const networkMode = statusRows[0]?.mode ?? "ONLINE";

  if (networkMode !== "ONLINE" && !parseResult.data.force) {
    res.status(400).json({
      error: "OFFLINE_MODE",
      message: "Cannot sync while in OFFLINE mode. Set network to ONLINE first or use force=true.",
    });
    return;
  }

  // Find all pending/unconfirmed transactions
  const pending = await db
    .select()
    .from(transactionsTable)
    .where(
      or(
        eq(transactionsTable.status, "PENDING"),
        eq(transactionsTable.status, "UNCONFIRMED"),
      )
    );

  let successCount = 0;
  let failedCount = 0;
  const synced: typeof pending = [];

  for (const txn of pending) {
    const score = Number(txn.confidence_score);
    let newStatus: string;
    let outcome: "success" | "failed";

    if (txn.merchant_decision === "REJECTED") {
      newStatus = "FAILED";
      failedCount++;
      outcome = "failed";
    } else if (txn.merchant_decision === "ACCEPTED" || txn.merchant_decision === "ACCEPTED_WITH_RISK") {
      newStatus = "SUCCESS";
      successCount++;
      outcome = "success";
    } else if (score >= 70) {
      newStatus = "SUCCESS";
      successCount++;
      outcome = "success";
    } else if (score >= 40) {
      newStatus = "SUCCESS";
      successCount++;
      outcome = "success";
    } else {
      newStatus = "FAILED";
      failedCount++;
      outcome = "failed";
    }

    await db
      .update(transactionsTable)
      .set({ status: newStatus })
      .where(eq(transactionsTable.txn_id, txn.txn_id));

    // Update user trust memory
    await upsertUserProfile(txn.customer_id, txn.customer_name, Number(txn.amount), outcome);

    synced.push({ ...txn, status: newStatus });
  }

  await addLog(
    "SYNC",
    `[SYNC] ✅ Sync complete — ${pending.length} transactions resolved: ${successCount} SUCCESS, ${failedCount} FAILED`
  );

  const result = synced.map(serializeTransaction);

  res.json({
    synced_count: pending.length,
    success_count: successCount,
    failed_count: failedCount,
    transactions: result,
  });
});

export default router;
