import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, networkStatusTable, userProfilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateSignature } from "../lib/crypto";
import { computeConfidenceScore, upsertUserProfile } from "../lib/scoring";
import { addLog } from "../lib/logger";
import {
  CreateTransactionBody,
  GetTransactionParams,
  MerchantDecideBody,
  MerchantDecideParams,
} from "@workspace/api-zod";

const router = Router();

async function getCurrentNetworkMode(): Promise<string> {
  const rows = await db
    .select()
    .from(networkStatusTable)
    .orderBy(desc(networkStatusTable.id))
    .limit(1);
  return rows[0]?.mode ?? "ONLINE";
}

function serializeTransaction(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    amount: Number(t.amount),
    confidence_score: Number(t.confidence_score),
    fraud_flags: Array.isArray(t.fraud_flags) ? t.fraud_flags : [],
    score_breakdown: Array.isArray(t.score_breakdown) ? t.score_breakdown : [],
  };
}

// GET /api/transactions
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.timestamp));
    res.json(rows.map(serializeTransaction));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch transactions" });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  const parseResult = CreateTransactionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parseResult.error.message });
    return;
  }

  const body = parseResult.data;
  const networkMode = await getCurrentNetworkMode();
  const txnId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const signature = generateSignature(txnId, body.amount, body.customer_id, timestamp);

  const { score, level, flags, breakdown, proofStrength } = await computeConfidenceScore(
    body.customer_id,
    body.customer_name,
    body.amount,
    networkMode
  );

  const status = networkMode === "OFFLINE" ? "UNCONFIRMED" : "PENDING";

  const txn = {
    txn_id: txnId,
    amount: body.amount.toString(),
    customer_id: body.customer_id,
    customer_name: body.customer_name,
    merchant_id: body.merchant_id,
    merchant_name: body.merchant_name,
    timestamp,
    status,
    signature,
    proof_strength: proofStrength,
    confidence_score: score.toString(),
    confidence_level: level,
    merchant_decision: "PENDING" as const,
    fraud_flags: flags,
    score_breakdown: breakdown,
    network_mode: networkMode,
  };

  await db.insert(transactionsTable).values(txn);

  // Initialize user profile on first transaction
  await upsertUserProfile(body.customer_id, body.customer_name, body.amount, "failed"); // Starts as pending (counted as failed until synced)

  await addLog(
    "INFO",
    `Transaction ${txnId} created — ₹${body.amount} — ${body.customer_name} → ${body.merchant_name} — Score: ${score} (${level}) — Proof: ${proofStrength}`,
    txnId
  );

  res.status(201).json(serializeTransaction(txn as any));
});

// GET /api/transactions/:txnId
router.get("/:txnId", async (req, res) => {
  const parseResult = GetTransactionParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parseResult.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.txn_id, parseResult.data.txnId));

  if (rows.length === 0) {
    res.status(404).json({ error: "NOT_FOUND", message: "Transaction not found" });
    return;
  }

  res.json(serializeTransaction(rows[0]));
});

// POST /api/transactions/:txnId/decide
router.post("/:txnId/decide", async (req, res) => {
  const paramsResult = MerchantDecideParams.safeParse(req.params);
  const bodyResult = MerchantDecideBody.safeParse(req.body);

  if (!paramsResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: paramsResult.error.message });
    return;
  }
  if (!bodyResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: bodyResult.error.message });
    return;
  }

  const txnId = paramsResult.data.txnId;
  const decision = bodyResult.data.decision;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.txn_id, txnId));

  if (rows.length === 0) {
    res.status(404).json({ error: "NOT_FOUND", message: "Transaction not found" });
    return;
  }

  const txn = rows[0];
  const newStatus =
    decision === "REJECTED" ? "REJECTED" :
    decision === "ACCEPTED_WITH_RISK" ? "ACCEPTED_WITH_RISK" : "ACCEPTED";

  await db
    .update(transactionsTable)
    .set({ merchant_decision: decision, status: newStatus })
    .where(eq(transactionsTable.txn_id, txnId));

  const updated = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.txn_id, txnId));

  // Update user trust profile based on merchant decision
  if (decision === "REJECTED") {
    await upsertUserProfile(txn.customer_id, txn.customer_name, Number(txn.amount), "failed");
  }

  const level = decision === "REJECTED" ? "WARNING" : "INFO";
  const emoji = decision === "ACCEPTED" ? "✅" : decision === "ACCEPTED_WITH_RISK" ? "⚠️" : "❌";
  await addLog(
    level as any,
    `[DECISION] ${emoji} Merchant ${decision} — ${txnId} (₹${Number(txn.amount).toLocaleString("en-IN")})`,
    txnId
  );

  res.json(serializeTransaction(updated[0]));
});

export default router;
