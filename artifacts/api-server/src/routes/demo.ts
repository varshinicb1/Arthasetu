import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, networkStatusTable, userProfilesTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { generateSignature } from "../lib/crypto";
import { addLog } from "../lib/logger";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/demo/run
router.post("/run", async (_req, res) => {
  const timestamp = new Date().toISOString();

  // Step 1: Set up trusted customer profile
  const trustedProfile = {
    customer_id: "DEMO-TRUSTED-001",
    customer_name: "Priya Sharma",
    success_count: 47,
    failed_count: 2,
    fraud_count: 0,
    total_transactions: 49,
    avg_amount: "1850.00",
    reliability_score: "95.00",
    last_updated: timestamp,
  };

  const riskProfile = {
    customer_id: "DEMO-RISK-001",
    customer_name: "Rahul Mehta",
    success_count: 3,
    failed_count: 5,
    fraud_count: 2,
    total_transactions: 10,
    avg_amount: "8500.00",
    reliability_score: "20.00",
    last_updated: timestamp,
  };

  // Upsert profiles
  for (const profile of [trustedProfile, riskProfile]) {
    const existing = await db.select().from(userProfilesTable).where(eq(userProfilesTable.customer_id, profile.customer_id));
    if (existing.length === 0) {
      await db.insert(userProfilesTable).values(profile);
    } else {
      await db.update(userProfilesTable).set(profile).where(eq(userProfilesTable.customer_id, profile.customer_id));
    }
  }

  // Step 2: Set network to OFFLINE
  await db.insert(networkStatusTable).values({ mode: "OFFLINE", updated_at: timestamp });
  await addLog("INFO", "🔴 Demo started — Network set to OFFLINE mode");

  // Step 3: Normal payment from trusted customer — HIGH confidence
  const txn1Id = `TXN-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const sig1 = generateSignature(txn1Id, 1200, "DEMO-TRUSTED-001", timestamp);
  await db.insert(transactionsTable).values({
    txn_id: txn1Id,
    amount: "1200",
    customer_id: "DEMO-TRUSTED-001",
    customer_name: "Priya Sharma",
    merchant_id: "MERCH-DEMO-001",
    merchant_name: "ArthaSetu Demo Store",
    timestamp,
    status: "UNCONFIRMED",
    signature: sig1,
    proof_strength: "HIGH",
    confidence_score: "88",
    confidence_level: "HIGH",
    merchant_decision: "PENDING",
    fraud_flags: [],
    score_breakdown: [
      { label: "Base Score", delta: 50, reason: "Starting trust baseline" },
      { label: "Trusted User", delta: 20, reason: "95% reliability score" },
      { label: "Established Customer", delta: 5, reason: "49 successful transactions" },
      { label: "Moderate Amount", delta: 8, reason: "₹1,200 is within normal range" },
      { label: "Offline Transaction", delta: -15, reason: "No bank confirmation available" },
      { label: "Strong Proof", delta: 5, reason: "Cryptographic signature verified" },
      { label: "Normal Frequency", delta: 5, reason: "No recent transactions in last 5 minutes" },
    ],
    network_mode: "OFFLINE",
  });
  await addLog("INFO", `[TXN] 💰 Priya Sharma initiated ₹1,200 payment — Score: 88 (HIGH)`, txn1Id);

  // Step 4: High-risk payment from risky customer — LOW confidence
  const txn2Id = `TXN-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const sig2 = generateSignature(txn2Id, 15000, "DEMO-RISK-001", timestamp);
  await db.insert(transactionsTable).values({
    txn_id: txn2Id,
    amount: "15000",
    customer_id: "DEMO-RISK-001",
    customer_name: "Rahul Mehta",
    merchant_id: "MERCH-DEMO-001",
    merchant_name: "ArthaSetu Demo Store",
    timestamp,
    status: "UNCONFIRMED",
    signature: sig2,
    proof_strength: "LOW",
    confidence_score: "18",
    confidence_level: "LOW",
    merchant_decision: "PENDING",
    fraud_flags: ["HIGH_AMOUNT", "LOW_RELIABILITY_USER", "FRAUD_HISTORY", "OFFLINE_TRANSACTION"],
    score_breakdown: [
      { label: "Base Score", delta: 50, reason: "Starting trust baseline" },
      { label: "Low Reliability", delta: -15, reason: "20% reliability score" },
      { label: "Fraud History", delta: -20, reason: "2 prior fraud flags" },
      { label: "High Amount", delta: -20, reason: "₹15,000 is above ₹10,000" },
      { label: "Offline Transaction", delta: -15, reason: "No bank confirmation available" },
      { label: "Weak Proof", delta: -5, reason: "Low trust environment reduces proof validity" },
      { label: "Normal Frequency", delta: 5, reason: "No other recent transactions" },
    ],
    network_mode: "OFFLINE",
  });
  await addLog("WARNING", `[RISK] ⚠️ Rahul Mehta attempting ₹15,000 payment — Score: 18 (LOW) — Multiple fraud flags`, txn2Id);

  // Step 5: Medium confidence payment
  const txn3Id = `TXN-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const sig3 = generateSignature(txn3Id, 3500, "DEMO-MED-001", timestamp);
  await db.insert(transactionsTable).values({
    txn_id: txn3Id,
    amount: "3500",
    customer_id: "DEMO-MED-001",
    customer_name: "Anita Patel",
    merchant_id: "MERCH-DEMO-002",
    merchant_name: "Premium Electronics",
    timestamp,
    status: "UNCONFIRMED",
    signature: sig3,
    proof_strength: "MEDIUM",
    confidence_score: "55",
    confidence_level: "MEDIUM",
    merchant_decision: "PENDING",
    fraud_flags: ["OFFLINE_TRANSACTION"],
    score_breakdown: [
      { label: "Base Score", delta: 50, reason: "Starting trust baseline" },
      { label: "New Customer", delta: -5, reason: "No transaction history" },
      { label: "Large Amount", delta: -10, reason: "₹3,500 requires review" },
      { label: "Offline Transaction", delta: -15, reason: "No bank confirmation available" },
      { label: "Normal Frequency", delta: 5, reason: "No recent transactions" },
    ],
    network_mode: "OFFLINE",
  });
  await addLog("INFO", `[TXN] 💰 Anita Patel initiated ₹3,500 payment — Score: 55 (MEDIUM)`, txn3Id);

  await addLog("INFO", `[DEMO] 📊 3 demo transactions ready. Switch to Merchant tab to review decisions.`);

  res.json({
    success: true,
    message: `Demo loaded! Network is OFFLINE. 3 transactions created with HIGH/MEDIUM/LOW trust scores for merchant review.`,
  });
});

export default router;
