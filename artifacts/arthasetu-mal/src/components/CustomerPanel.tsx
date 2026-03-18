import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreateTransaction, useGetTransactions } from "@workspace/api-client-react";
import type { ExtendedTransaction } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Clock, XCircle, ShieldAlert, Wifi, WifiOff, CreditCard, TrendingUp, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TrustBreakdown from "./TrustBreakdown";
import { OverlayExplanation } from "./demo/OverlayExplanation";
import { TrustScoreMeter } from "./demo/TrustScoreMeter";

interface CustomerPanelProps {
  networkMode: string;
}

interface PaymentForm {
  customer_name: string;
  customer_id: string;
  merchant_id: string;
  merchant_name: string;
  amount: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
    PENDING: { label: "Pending", className: "bg-yellow-900/60 text-yellow-300 border-yellow-700/60", Icon: Clock },
    UNCONFIRMED: { label: "Unconfirmed", className: "bg-orange-900/60 text-orange-300 border-orange-700/60", Icon: ShieldAlert },
    SUCCESS: { label: "Success", className: "bg-green-900/60 text-green-300 border-green-700/60", Icon: CheckCircle },
    FAILED: { label: "Failed", className: "bg-red-900/60 text-red-300 border-red-700/60", Icon: XCircle },
    REJECTED: { label: "Rejected", className: "bg-red-900/60 text-red-300 border-red-700/60", Icon: XCircle },
    ACCEPTED: { label: "Accepted", className: "bg-green-900/60 text-green-300 border-green-700/60", Icon: CheckCircle },
    ACCEPTED_WITH_RISK: { label: "Accepted (Risk)", className: "bg-yellow-900/60 text-yellow-300 border-yellow-700/60", Icon: ShieldAlert },
  };
  const cfg = config[status] ?? { label: status, className: "bg-gray-800 text-gray-300 border-gray-700", Icon: Clock };
  const { Icon } = cfg;
  return (
    <Badge className={`${cfg.className} border flex items-center gap-1 text-xs`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function MiniTrustBar({ score, level }: { score: number; level: string }) {
  const color = level === "HIGH" ? "bg-green-500" : level === "MEDIUM" ? "bg-yellow-500" : "bg-red-500";
  const textColor = level === "HIGH" ? "text-green-400" : level === "MEDIUM" ? "text-yellow-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Trust Score</span>
        <span className={`${textColor} font-semibold`}>{score.toFixed(0)}/100 — {level}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TransactionCard({ txn }: { txn: ExtendedTransaction }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/60 p-4 space-y-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-500 truncate">{txn.txn_id}</p>
          <p className="text-lg font-bold text-white mt-0.5">
            ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <StatusBadge status={txn.status} />
      </div>

      <MiniTrustBar score={txn.confidence_score} level={txn.confidence_level} />

      {/* Proof Badge */}
      <div className="flex items-center gap-2">
        <Lock className={`w-3 h-3 ${txn.proof_strength === "HIGH" ? "text-green-400" : txn.proof_strength === "MEDIUM" ? "text-yellow-400" : "text-red-400"}`} />
        <span className={`text-xs font-medium ${txn.proof_strength === "HIGH" ? "text-green-400" : txn.proof_strength === "MEDIUM" ? "text-yellow-400" : "text-red-400"}`}>
          Proof Generated — {txn.proof_strength} strength ✔
        </span>
      </div>

      {txn.fraud_flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {txn.fraud_flags.map((flag) => (
            <span key={flag} className="text-xs bg-red-900/40 text-red-300 border border-red-800/50 px-1.5 py-0.5 rounded">
              ⚠ {flag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          {txn.network_mode === "ONLINE" ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
          {txn.network_mode}
        </span>
        <span>→ {txn.merchant_name}</span>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          {showBreakdown ? "Hide" : "Why?"} ↗
        </button>
      </div>

      {/* Signature */}
      <p className="text-xs font-mono text-gray-700 truncate" title={txn.signature}>
        Sig: {txn.signature?.slice(0, 32)}…
      </p>

      {/* Score Breakdown */}
      {showBreakdown && txn.score_breakdown && txn.score_breakdown.length > 0 && (
        <div className="pt-2 border-t border-gray-700/50">
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

export default function CustomerPanel({ networkMode }: CustomerPanelProps) {
  const [lastTxn, setLastTxn] = useState<ExtendedTransaction | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentForm>({
    defaultValues: {
      customer_name: "Priya Sharma",
      customer_id: "CUST-001",
      merchant_id: "MERCH-001",
      merchant_name: "Demo Merchant",
      amount: "1500",
    },
  });

  const createTxn = useCreateTransaction({
    mutation: {
      onSuccess: (data: any) => {
        setLastTxn(data as any as ExtendedTransaction);
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
        toast({
          title: data.confidence_level === "HIGH" ? "✅ Transaction submitted" : data.confidence_level === "MEDIUM" ? "⚠️ Transaction submitted with caution" : "🚨 High-risk transaction submitted",
          description: `Score: ${(data.confidence_score as any).toFixed ? (data.confidence_score as any).toFixed(0) : data.confidence_score}/100 — ${data.status}`
        });
      },
      onError: () => toast({ title: "Failed to submit transaction", variant: "destructive" }),
    },
  });

  const { data: allTxns } = useGetTransactions({ query: { refetchInterval: 5000 } });

  const onSubmit = (data: PaymentForm) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    createTxn.mutate({ amount, customer_id: data.customer_id, customer_name: data.customer_name, merchant_id: data.merchant_id, merchant_name: data.merchant_name });
  };

  const isOffline = networkMode === "OFFLINE";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Payment Form */}
      <div className="space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
              Initiate Payment
            </CardTitle>
            <CardDescription>
              {isOffline ? (
                <span className="flex items-center gap-1.5 text-orange-400 text-xs font-medium">
                  <WifiOff className="w-3.5 h-3.5" />
                  Network OFFLINE — transaction will be captured as UNCONFIRMED with cryptographic proof
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                  <Wifi className="w-3.5 h-3.5" />
                  Network ONLINE — bank confirmation available
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <OverlayExplanation stepIndex={1} align="top" />
            <OverlayExplanation stepIndex={2} align="right" />
            <OverlayExplanation stepIndex={3} align="right" />
            <OverlayExplanation stepIndex={4} align="right" />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Your Name</Label>
                  <Input {...register("customer_name", { required: true })}
                    className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500 focus:ring-indigo-500/20" placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Customer ID</Label>
                  <Input {...register("customer_id", { required: true })}
                    className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500" placeholder="CUST-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Merchant</Label>
                  <Input {...register("merchant_name", { required: true })}
                    className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500" placeholder="Merchant name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Merchant ID</Label>
                  <Input {...register("merchant_id", { required: true })}
                    className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500" placeholder="MERCH-001" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Amount (₹)</Label>
                <Input {...register("amount", { required: true, min: 1 })} type="number" min="1" step="0.01"
                  className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500 text-lg font-semibold" placeholder="0.00" />
                {errors.amount && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Enter a valid amount</p>}
              </div>
              <Button type="submit" disabled={createTxn.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11 text-sm font-semibold transition-all">
                {createTxn.isPending ? (
                  <><span className="animate-spin mr-2">⟳</span> Processing…</>
                ) : (
                  <><CreditCard className="w-4 h-4 mr-2" /> Submit Payment</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Last Transaction Trust Breakdown */}
        {lastTxn && (
          <Card className="bg-gray-900 border-gray-800 relative z-10 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                Trust Analysis — Latest Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6 scale-90">
                <TrustScoreMeter score={lastTxn.confidence_score} animated={true} />
              </div>
              {lastTxn.score_breakdown && lastTxn.score_breakdown.length > 0 ? (
                <TrustBreakdown
                  score={lastTxn.confidence_score}
                  level={lastTxn.confidence_level}
                  proofStrength={lastTxn.proof_strength ?? "MEDIUM"}
                  breakdown={lastTxn.score_breakdown}
                />
              ) : (
                <p className="text-gray-500 text-xs">No breakdown available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Payment History
          </CardTitle>
          <CardDescription className="text-gray-500 text-xs">
            Click "Why?" on any transaction to see the trust score explanation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allTxns || allTxns.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No transactions yet.</p>
              <p className="text-gray-600 text-xs mt-1">Submit a payment to get started.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {(allTxns as any[] as ExtendedTransaction[]).slice(0, 12).map((txn) => (
                <TransactionCard key={txn.txn_id} txn={txn} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
