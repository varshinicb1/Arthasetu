import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetTransactions, useMerchantDecide } from "@workspace/api-client-react";
import type { ExtendedTransaction, UserProfile } from "@/lib/types";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { fetchUserProfile } from "@/lib/api";
import { CheckCircle, XCircle, ShieldAlert, Clock, AlertTriangle, Store, Wifi, WifiOff } from "lucide-react";
import TrustBreakdown from "./TrustBreakdown";
import UserTrustProfile from "./UserTrustProfile";
import { OverlayExplanation } from "./demo/OverlayExplanation";
import { FraudAlertOverlay } from "./demo/FraudAlertOverlay";
import { useDemo } from "@/context/DemoContext";

function TrustRing({ score, level }: { score: number; level: string }) {
  const color = level === "HIGH" ? "#22c55e" : level === "MEDIUM" ? "#eab308" : "#ef4444";
  const size = 64;
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{score.toFixed(0)}</span>
      </div>
    </div>
  );
}

interface TxnCardProps {
  txn: ExtendedTransaction;
  onDecide: (d: "ACCEPTED" | "ACCEPTED_WITH_RISK" | "REJECTED") => void;
  isPending: boolean;
}

function TransactionCard({ txn, onDecide, isPending }: TxnCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["profile", txn.customer_id],
    queryFn: () => fetchUserProfile(txn.customer_id),
    staleTime: 30000,
  });

  const isDecided = txn.merchant_decision !== "PENDING" || ["SUCCESS", "FAILED", "REJECTED", "ACCEPTED", "ACCEPTED_WITH_RISK"].includes(txn.status);

  const riskLabel = txn.confidence_level === "HIGH" ? { text: "Low Risk", cls: "bg-green-900/40 text-green-400 border-green-800/50" }
    : txn.confidence_level === "MEDIUM" ? { text: "Caution", cls: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50" }
    : { text: "High Risk", cls: "bg-red-900/40 text-red-400 border-red-800/50" };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      txn.fraud_flags.length > 0 && !isDecided
        ? "bg-red-950/20 border-red-900/50"
        : "bg-gray-800/50 border-gray-700/60 hover:border-gray-600"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <TrustRing score={txn.confidence_score} level={txn.confidence_level} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white font-bold text-base">
                ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-400">{txn.customer_name}</p>
              <p className="font-mono text-xs text-gray-600">{txn.txn_id}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${riskLabel.cls}`}>
                {riskLabel.text}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {txn.network_mode === "ONLINE" ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                {txn.network_mode}
              </span>
            </div>
          </div>

          {/* Fraud flags */}
          {txn.fraud_flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {txn.fraud_flags.map((flag) => (
                <span key={flag} className="text-xs bg-red-900/50 text-red-300 border border-red-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {flag}
                </span>
              ))}
            </div>
          )}

          {/* User trust profile (inline) */}
          <div className="mt-2">
            <UserTrustProfile profile={profile ?? null} loading={profileLoading} />
          </div>

          {/* Action Buttons */}
          {isDecided ? (
            <div className="mt-3">
              <Badge className={
                ["REJECTED", "FAILED"].includes(txn.merchant_decision || txn.status)
                  ? "bg-red-900/60 text-red-300 border border-red-700/60"
                  : txn.merchant_decision === "ACCEPTED_WITH_RISK"
                  ? "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60"
                  : "bg-green-900/60 text-green-300 border border-green-700/60"
              }>
                {txn.merchant_decision !== "PENDING" ? txn.merchant_decision.replace(/_/g, " ") : txn.status}
              </Badge>
            </div>
          ) : (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" disabled={isPending} onClick={() => onDecide("ACCEPTED")}
                className="bg-green-800 hover:bg-green-700 text-white text-xs h-8 px-3 flex-1">
                <CheckCircle className="w-3 h-3 mr-1" /> Accept
              </Button>
              <Button size="sm" disabled={isPending} onClick={() => onDecide("ACCEPTED_WITH_RISK")}
                className="bg-yellow-800 hover:bg-yellow-700 text-white text-xs h-8 px-3 flex-1">
                <ShieldAlert className="w-3 h-3 mr-1" /> w/ Risk
              </Button>
              <Button size="sm" disabled={isPending} onClick={() => onDecide("REJECTED")}
                className="bg-red-900 hover:bg-red-800 text-white text-xs h-8 px-3 flex-1">
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          )}

          {/* Toggle breakdown */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {new Date(txn.timestamp).toLocaleTimeString()}
            </span>
            {txn.score_breakdown && txn.score_breakdown.length > 0 && (
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {showBreakdown ? "Hide Trust Analysis ↑" : "Show Trust Analysis ↓"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Score breakdown panel */}
      {showBreakdown && txn.score_breakdown && txn.score_breakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/40">
          <TrustBreakdown
            score={txn.confidence_score}
            level={txn.confidence_level}
            proofStrength={txn.proof_strength ?? "MEDIUM"}
            breakdown={txn.score_breakdown}
          />
        </div>
      )}
    </div>
  );
}

export default function MerchantPanel() {
  const { currentStepIndex } = useDemo();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawTxns, isLoading } = useGetTransactions({ query: { queryKey: ["/api/transactions"], refetchInterval: 4000 } });
  const transactions = (rawTxns ?? []) as any[] as ExtendedTransaction[];

  const decide = useMerchantDecide({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
        queryClient.invalidateQueries({ queryKey: ["profile", data.customer_id] });
        const icon = data.merchant_decision === "REJECTED" ? "❌" : data.merchant_decision === "ACCEPTED_WITH_RISK" ? "⚠️" : "✅";
        toast({ title: `${icon} Decision recorded`, description: `${data.txn_id}: ${data.merchant_decision}` });
      },
      onError: () => toast({ title: "Failed to record decision", variant: "destructive" }),
    },
  });

  const pending = transactions.filter((t) => t.merchant_decision === "PENDING" && !["SUCCESS", "FAILED"].includes(t.status));
  const decided = transactions.filter((t) => t.merchant_decision !== "PENDING" || ["SUCCESS", "FAILED"].includes(t.status));

  const stats = [
    { label: "Awaiting Review", value: pending.length, color: "text-yellow-400", icon: Clock },
    { label: "Accepted", value: decided.filter((t) => ["ACCEPTED", "SUCCESS"].includes(t.merchant_decision) || t.status === "SUCCESS").length, color: "text-green-400", icon: CheckCircle },
    { label: "With Risk", value: decided.filter((t) => t.merchant_decision === "ACCEPTED_WITH_RISK").length, color: "text-yellow-400", icon: ShieldAlert },
    { label: "Rejected", value: decided.filter((t) => ["REJECTED", "FAILED"].includes(t.merchant_decision) || ["REJECTED", "FAILED"].includes(t.status)).length, color: "text-red-400", icon: XCircle },
  ];

  return (
    <div className="space-y-6 relative">
      <FraudAlertOverlay isVisible={currentStepIndex === 4} />
      <OverlayExplanation stepIndex={5} align="left" />
      <OverlayExplanation stepIndex={6} align="bottom" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                </div>
                <Icon className={`w-5 h-5 ${color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pending */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-yellow-600/20 border border-yellow-600/40 flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              Awaiting Decision
              {pending.length > 0 && (
                <Badge className="bg-yellow-900 text-yellow-300 border border-yellow-700/60 ml-1 text-xs">
                  {pending.length} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              Review trust scores, user history, and fraud signals before deciding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-10 h-10 text-green-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">All clear! No pending transactions.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {pending.map((txn) => (
                  <TransactionCard key={txn.txn_id} txn={txn} isPending={decide.isPending}
                    onDecide={(d) => decide.mutate({ txnId: txn.txn_id, data: { decision: d } })} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decided */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Decision History</CardTitle>
            <CardDescription className="text-gray-500 text-xs">Past merchant decisions and their outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            {decided.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No decisions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {decided.map((txn) => (
                  <TransactionCard key={txn.txn_id} txn={txn} isPending={false} onDecide={() => {}} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
