import { db } from "@workspace/db";
import { transactionsTable, userProfilesTable } from "@workspace/db";
import type { ScoreBreakdownItem } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface ScoreResult {
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  flags: string[];
  breakdown: ScoreBreakdownItem[];
  proofStrength: "HIGH" | "MEDIUM" | "LOW";
}

export async function computeConfidenceScore(
  customerId: string,
  customerName: string,
  amount: number,
  networkMode: string
): Promise<ScoreResult> {
  const flags: string[] = [];
  const breakdown: ScoreBreakdownItem[] = [];
  let score = 50; // Base score

  breakdown.push({ label: "Base Score", delta: 50, reason: "Starting trust baseline" });

  // ─── 1. User Profile / Trust Memory ──────────────────────────────────
  const profileRows = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.customer_id, customerId));

  const profile = profileRows[0] ?? null;

  if (profile) {
    const reliabilityScore = Number(profile.reliability_score);
    const fraudCount = profile.fraud_count;
    const total = profile.total_transactions;

    if (reliabilityScore >= 80) {
      score += 20;
      breakdown.push({ label: "Trusted User", delta: 20, reason: `${reliabilityScore.toFixed(0)}% reliability score` });
    } else if (reliabilityScore >= 60) {
      score += 10;
      breakdown.push({ label: "Reliable User", delta: 10, reason: `${reliabilityScore.toFixed(0)}% reliability score` });
    } else if (reliabilityScore < 40) {
      score -= 15;
      breakdown.push({ label: "Low Reliability", delta: -15, reason: `${reliabilityScore.toFixed(0)}% reliability score` });
      flags.push("LOW_RELIABILITY_USER");
    }

    if (fraudCount > 0) {
      const fraudPenalty = Math.min(fraudCount * 10, 30);
      score -= fraudPenalty;
      breakdown.push({ label: "Fraud History", delta: -fraudPenalty, reason: `${fraudCount} prior fraud flag${fraudCount > 1 ? "s" : ""}` });
      flags.push("FRAUD_HISTORY");
    }

    if (total >= 10 && fraudCount === 0) {
      score += 5;
      breakdown.push({ label: "Established Customer", delta: 5, reason: `${total} successful transactions` });
    }
  } else {
    score -= 5;
    breakdown.push({ label: "New Customer", delta: -5, reason: "No transaction history" });
  }

  // ─── 2. Amount Factor ────────────────────────────────────────────────
  if (amount > 10000) {
    score -= 20;
    breakdown.push({ label: "High Amount", delta: -20, reason: `₹${amount.toLocaleString("en-IN")} is above ₹10,000` });
    flags.push("HIGH_AMOUNT");
  } else if (amount > 5000) {
    score -= 10;
    breakdown.push({ label: "Large Amount", delta: -10, reason: `₹${amount.toLocaleString("en-IN")} is above ₹5,000` });
    flags.push("LARGE_AMOUNT");
  } else if (amount <= 500) {
    score += 15;
    breakdown.push({ label: "Small Amount", delta: 15, reason: `₹${amount.toLocaleString("en-IN")} is a low-risk amount` });
  } else if (amount <= 2000) {
    score += 8;
    breakdown.push({ label: "Moderate Amount", delta: 8, reason: `₹${amount.toLocaleString("en-IN")} is within normal range` });
  }

  // ─── 3. Network Mode ─────────────────────────────────────────────────
  if (networkMode === "OFFLINE") {
    score -= 15;
    breakdown.push({ label: "Offline Transaction", delta: -15, reason: "No bank confirmation available" });
    flags.push("OFFLINE_TRANSACTION");
  } else {
    score += 10;
    breakdown.push({ label: "Online Network", delta: 10, reason: "Real-time bank verification possible" });
  }

  // ─── 4. Transaction Frequency (last 5 minutes) ─────────────────────
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const allUserTxns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.customer_id, customerId));

  const recent = allUserTxns.filter((t) => t.timestamp >= fiveMinutesAgo);

  if (recent.length >= 5) {
    score -= 25;
    breakdown.push({ label: "Rapid Transactions", delta: -25, reason: `${recent.length} transactions in last 5 minutes` });
    flags.push("RAPID_TRANSACTIONS");
  } else if (recent.length >= 3) {
    score -= 12;
    breakdown.push({ label: "Frequent Transactions", delta: -12, reason: `${recent.length} transactions in last 5 minutes` });
    flags.push("FREQUENT_TRANSACTIONS");
  } else if (recent.length === 0) {
    score += 5;
    breakdown.push({ label: "Normal Frequency", delta: 5, reason: "No recent transactions in last 5 minutes" });
  }

  // ─── 5. Proof Strength ──────────────────────────────────────────────
  const proofStrength =
    score >= 65 ? "HIGH" :
    score >= 35 ? "MEDIUM" : "LOW";

  if (proofStrength === "HIGH") {
    score += 5;
    breakdown.push({ label: "Strong Proof", delta: 5, reason: "Cryptographic signature verified with high confidence" });
  } else if (proofStrength === "LOW") {
    score -= 5;
    breakdown.push({ label: "Weak Proof", delta: -5, reason: "Low trust environment reduces proof validity" });
  }

  score = Math.max(0, Math.min(100, score));

  const level: "HIGH" | "MEDIUM" | "LOW" =
    score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

  return { score, level, flags, breakdown, proofStrength };
}

export async function upsertUserProfile(
  customerId: string,
  customerName: string,
  amount: number,
  outcome: "success" | "failed" | "fraud"
): Promise<void> {
  const existing = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.customer_id, customerId));

  const now = new Date().toISOString();

  if (existing.length === 0) {
    const successCount = outcome === "success" ? 1 : 0;
    const failedCount = outcome === "failed" ? 1 : 0;
    const fraudCount = outcome === "fraud" ? 1 : 0;
    const total = 1;
    const reliability = outcome === "success" ? 80 : outcome === "fraud" ? 20 : 50;

    await db.insert(userProfilesTable).values({
      customer_id: customerId,
      customer_name: customerName,
      success_count: successCount,
      failed_count: failedCount,
      fraud_count: fraudCount,
      total_transactions: total,
      avg_amount: amount.toString(),
      reliability_score: reliability.toString(),
      last_updated: now,
    });
  } else {
    const p = existing[0];
    const successCount = p.success_count + (outcome === "success" ? 1 : 0);
    const failedCount = p.failed_count + (outcome === "failed" ? 1 : 0);
    const fraudCount = p.fraud_count + (outcome === "fraud" ? 1 : 0);
    const total = p.total_transactions + 1;
    const currentAvg = Number(p.avg_amount);
    const newAvg = (currentAvg * p.total_transactions + amount) / total;

    // Reliability = (successes / total) * 100, penalized for fraud
    const rawReliability = (successCount / total) * 100;
    const fraudPenalty = Math.min(fraudCount * 5, 40);
    const reliability = Math.max(0, rawReliability - fraudPenalty);

    await db
      .update(userProfilesTable)
      .set({
        customer_name: customerName,
        success_count: successCount,
        failed_count: failedCount,
        fraud_count: fraudCount,
        total_transactions: total,
        avg_amount: newAvg.toFixed(2),
        reliability_score: reliability.toFixed(2),
        last_updated: now,
      })
      .where(eq(userProfilesTable.customer_id, customerId));
  }
}
