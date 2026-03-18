import { db } from "@workspace/db";
import { logsTable } from "@workspace/db";
import { randomUUID } from "crypto";

type LogLevel = "INFO" | "WARNING" | "ERROR" | "SYNC";

export async function addLog(
  level: LogLevel,
  message: string,
  txnId?: string
): Promise<void> {
  const entry = {
    id: randomUUID(),
    level,
    message,
    timestamp: new Date().toISOString(),
    txn_id: txnId ?? null,
  };
  await db.insert(logsTable).values(entry);
}
