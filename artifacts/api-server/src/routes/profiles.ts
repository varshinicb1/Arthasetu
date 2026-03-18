import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/profiles/:customerId
router.get("/:customerId", async (req, res) => {
  const { customerId } = req.params;

  const rows = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.customer_id, customerId));

  if (rows.length === 0) {
    res.json({
      customer_id: customerId,
      customer_name: "Unknown",
      success_count: 0,
      failed_count: 0,
      fraud_count: 0,
      total_transactions: 0,
      avg_amount: 0,
      reliability_score: 50,
      last_updated: new Date().toISOString(),
    });
    return;
  }

  const p = rows[0];
  res.json({
    ...p,
    avg_amount: Number(p.avg_amount),
    reliability_score: Number(p.reliability_score),
  });
});

// GET /api/profiles (all profiles)
router.get("/", async (_req, res) => {
  const rows = await db.select().from(userProfilesTable);
  res.json(rows.map((p) => ({
    ...p,
    avg_amount: Number(p.avg_amount),
    reliability_score: Number(p.reliability_score),
  })));
});

export default router;
