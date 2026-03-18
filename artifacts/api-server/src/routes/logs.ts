import { Router } from "express";
import { db } from "@workspace/db";
import { logsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// GET /api/logs
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(logsTable)
      .orderBy(desc(logsTable.timestamp));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch logs" });
  }
});

// DELETE /api/logs
router.delete("/", async (_req, res) => {
  try {
    await db.delete(logsTable);
    res.json({ success: true, message: "All logs cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to clear logs" });
  }
});

export default router;
