export interface ScoreBreakdownItem {
  label: string;
  delta: number;
  reason: string;
}

export interface ExtendedTransaction {
  txn_id: string;
  amount: number;
  customer_id: string;
  customer_name: string;
  merchant_id: string;
  merchant_name: string;
  timestamp: string;
  status: string;
  signature: string;
  proof_strength: string;
  confidence_score: number;
  confidence_level: string;
  merchant_decision: string;
  fraud_flags: string[];
  score_breakdown: ScoreBreakdownItem[];
  network_mode: string;
}

export interface UserProfile {
  customer_id: string;
  customer_name: string;
  success_count: number;
  failed_count: number;
  fraud_count: number;
  total_transactions: number;
  avg_amount: number;
  reliability_score: number;
  last_updated: string;
}
