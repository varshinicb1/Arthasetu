import { Router } from "express";
import { db } from "@workspace/db";
import { networkStatusTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { addLog } from "../lib/logger";
import { SetNetworkStatusBody } from "@workspace/api-zod";

const router = Router();

// GET /api/network/status
router.get("/status", async (_req, res) => {
  const rows = await db
    .select()
    .from(networkStatusTable)
    .orderBy(desc(networkStatusTable.id))
    .limit(1);

  if (rows.length === 0) {
    const status = {
      mode: "ONLINE" as const,
      updated_at: new Date().toISOString(),
    };
    await db.insert(networkStatusTable).values(status);
    res.json(status);
    return;
  }

  res.json({ mode: rows[0].mode, updated_at: rows[0].updated_at });
});

// POST /api/network/status
router.post("/status", async (req, res) => {
  const parseResult = SetNetworkStatusBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parseResult.error.message });
    return;
  }

  const { mode } = parseResult.data;
  const updated_at = new Date().toISOString();

  await db.insert(networkStatusTable).values({ mode, updated_at });

  await addLog(
    "INFO",
    `Network status changed to ${mode}`
  );

  res.json({ mode, updated_at });
});

export default router;
