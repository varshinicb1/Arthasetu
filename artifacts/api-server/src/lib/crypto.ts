import { createHmac } from "crypto";

const SECRET_KEY = process.env.SIGNATURE_SECRET ?? "arthasetu-offline-secret-key";

export function generateSignature(txnId: string, amount: number, customerId: string, timestamp: string): string {
  const payload = `${txnId}:${amount}:${customerId}:${timestamp}`;
  return createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
}

export function verifySignature(signature: string, txnId: string, amount: number, customerId: string, timestamp: string): boolean {
  const expected = generateSignature(txnId, amount, customerId, timestamp);
  return signature === expected;
}
