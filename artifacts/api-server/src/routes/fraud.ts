import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, networkStatusTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateSignature } from "../lib/crypto";
import { addLog } from "../lib/logger";
import { SimulateFraudBody } from "@workspace/api-zod";

const router = Router();

function serializeTransaction(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    amount: Number(t.amount),
    confidence_score: Number(t.confidence_score),
    fraud_flags: Array.isArray(t.fraud_flags) ? t.fraud_flags : [],
  };
}

async function getCurrentNetworkMode(): Promise<string> {
  const rows = await db
    .select()
    .from(networkStatusTable)
    .orderBy(desc(networkStatusTable.id))
    .limit(1);
  return rows[0]?.mode ?? "ONLINE";
}

// POST /api/fraud/simulate
router.post("/simulate", async (req, res) => {
  const parseResult = SimulateFraudBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parseResult.error.message });
    return;
  }

  const { type, txn_id } = parseResult.data;
  const networkMode = await getCurrentNetworkMode();
  const affectedTransactions: ReturnType<typeof serializeTransaction>[] = [];
  let message = "";
  let logMessage = "";

  if (type === "DOUBLE_ATTEMPT") {
    const baseTxnId = txn_id ?? `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const amount = 999.99;
    const customerId = "FRAUD-CUST-001";

    // Create duplicate transaction
    const dupId = `TXN-${Date.now() + 1}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const sig = generateSignature(dupId, amount, customerId, timestamp);

    const dupTxn = {
      txn_id: dupId,
      amount: amount.toString(),
      customer_id: customerId,
      customer_name: "John Doe (Fraudster)",
      merchant_id: "MERCH-001",
      merchant_name: "Demo Merchant",
      timestamp,
      status: "UNCONFIRMED",
      signature: sig,
      confidence_score: "10",
      confidence_level: "LOW" as const,
      merchant_decision: "PENDING" as const,
      fraud_flags: ["DOUBLE_ATTEMPT", "OFFLINE_TRANSACTION"],
      network_mode: networkMode,
    };

    await db.insert(transactionsTable).values(dupTxn);
    affectedTransactions.push(serializeTransaction(dupTxn as any));
    message = `Double attempt fraud simulated. Duplicate transaction ${dupId} created with LOW confidence.`;
    logMessage = `FRAUD ALERT: Double attempt detected — Transaction ${dupId} flagged for duplicate payment`;
  } else if (type === "RAPID_TRANSACTIONS") {
    const customerId = "FRAUD-CUST-002";
    const merchantId = "MERCH-001";
    const merchantName = "Demo Merchant";

    for (let i = 0; i < 5; i++) {
      const txnId = `TXN-${Date.now() + i}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const timestamp = new Date(Date.now() - (5 - i) * 10000).toISOString();
      const amount = 150 + i * 50;
      const sig = generateSignature(txnId, amount, customerId, timestamp);

      const score = Math.max(5, 35 - i * 5);
      const txn = {
        txn_id: txnId,
        amount: amount.toString(),
        customer_id: customerId,
        customer_name: "Jane Smith (Rapid Buyer)",
        merchant_id: merchantId,
        merchant_name: merchantName,
        timestamp,
        status: "UNCONFIRMED",
        signature: sig,
        confidence_score: score.toString(),
        confidence_level: "LOW" as const,
        merchant_decision: "PENDING" as const,
        fraud_flags: ["RAPID_TRANSACTIONS", i >= 3 ? "HIGH_FREQUENCY" : "FREQUENT_TRANSACTIONS"],
        network_mode: networkMode,
      };

      await db.insert(transactionsTable).values(txn);
      affectedTransactions.push(serializeTransaction(txn as any));
    }

    message = `Rapid transaction fraud simulated. 5 rapid transactions created from customer ${customerId}.`;
    logMessage = `FRAUD ALERT: Rapid transaction pattern detected — 5 transactions in under 1 minute from FRAUD-CUST-002`;
  } else if (type === "FAKE_RETRY") {
    const txnId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const amount = 4500;
    const customerId = "FRAUD-CUST-003";
    const sig = generateSignature(txnId, amount, customerId, timestamp);

    const txn = {
      txn_id: txnId,
      amount: amount.toString(),
      customer_id: customerId,
      customer_name: "Mike Chen (Retrier)",
      merchant_id: "MERCH-002",
      merchant_name: "Premium Store",
      timestamp,
      status: "UNCONFIRMED",
      signature: sig,
      confidence_score: "20",
      confidence_level: "LOW" as const,
      merchant_decision: "PENDING" as const,
      fraud_flags: ["FAKE_RETRY", "LARGE_AMOUNT", "OFFLINE_TRANSACTION"],
      network_mode: networkMode,
    };

    await db.insert(transactionsTable).values(txn);
    affectedTransactions.push(serializeTransaction(txn as any));
    message = `Fake retry fraud simulated. Transaction ${txnId} created as a suspected retry.`;
    logMessage = `FRAUD ALERT: Fake retry detected — Transaction ${txnId} flagged as suspected replay attack`;
  }

  const logId = randomUUID();
  const logEntry = {
    id: logId,
    level: "ERROR" as const,
    message: logMessage,
    timestamp: new Date().toISOString(),
    txn_id: affectedTransactions[0]?.txn_id,
  };

  await addLog("ERROR", logMessage, logEntry.txn_id);

  res.json({
    message,
    affected_transactions: affectedTransactions,
    log_entry: logEntry,
  });
});

export default router;
