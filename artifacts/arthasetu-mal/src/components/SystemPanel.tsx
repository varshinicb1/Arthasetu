import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetLogs, useClearLogs, useSetNetworkStatus,
  useSyncTransactions, useGetTransactions,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import type { NetworkStatus } from "@workspace/api-client-react";
import type { ExtendedTransaction, UserProfile } from "@/lib/types";
import { fetchAllProfiles } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSimulateFraud } from "@workspace/api-client-react";
import {
  Wifi, WifiOff, RefreshCw, Trash2, AlertTriangle, Zap, Activity,
  Info, Shield, TrendingUp, Users, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface SystemPanelProps {
  networkStatus?: NetworkStatus;
}

function LogLevelBadge({ level }: { level: string }) {
  const config: Record<string, string> = {
    INFO: "bg-blue-900/60 text-blue-300 border-blue-800/50",
    WARNING: "bg-yellow-900/60 text-yellow-300 border-yellow-800/50",
    ERROR: "bg-red-900/60 text-red-300 border-red-800/50",
    SYNC: "bg-purple-900/60 text-purple-300 border-purple-800/50",
  };
  return (
    <Badge className={`${config[level] ?? "bg-gray-800 text-gray-300 border-gray-700"} border text-xs px-1.5 py-0 font-mono shrink-0`}>
      {level}
    </Badge>
  );
}

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#6366f1"];

export default function SystemPanel({ networkStatus }: SystemPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOnline = networkStatus?.mode === "ONLINE";
  const [fraudType, setFraudType] = useState<"DOUBLE_ATTEMPT" | "RAPID_TRANSACTIONS" | "FAKE_RETRY">("DOUBLE_ATTEMPT");

  const { data: logs } = useGetLogs({ query: { refetchInterval: 3000 } });
  const { data: rawTxns } = useGetTransactions({ query: { refetchInterval: 5000 } });
  const transactions = (rawTxns ?? []) as any[] as ExtendedTransaction[];

  const { data: profiles } = useQuery<UserProfile[]>({
    queryKey: ["profiles"],
    queryFn: fetchAllProfiles,
    refetchInterval: 10000,
  });

  const setNetworkStatus = useSetNetworkStatus({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/network/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
        toast({ title: `Network set to ${data.mode}` });
      },
    },
  });

  const syncTxns = useSyncTransactions({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        toast({ title: "✅ Sync complete", description: `${data.synced_count} processed — ${data.success_count} success, ${data.failed_count} failed` });
      },
    },
  });

  const clearLogs = useClearLogs({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logs"] }); toast({ title: "Logs cleared" }); },
    },
  });

  const simulateFraud = useSimulateFraud({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
        toast({ title: "🚨 Fraud simulated", description: data.message });
      },
      onError: () => toast({ title: "Fraud simulation failed", variant: "destructive" }),
    },
  });

  // Chart data
  const statusData = [
    { name: "Success", value: transactions.filter((t) => t.status === "SUCCESS").length },
    { name: "Pending", value: transactions.filter((t) => ["PENDING", "UNCONFIRMED"].includes(t.status)).length },
    { name: "Failed", value: transactions.filter((t) => ["FAILED", "REJECTED"].includes(t.status)).length },
    { name: "Accepted w/ Risk", value: transactions.filter((t) => t.status === "ACCEPTED_WITH_RISK").length },
  ].filter((d) => d.value > 0);

  const decisionData = [
    { name: "Accepted", value: transactions.filter((t) => t.merchant_decision === "ACCEPTED").length },
    { name: "w/ Risk", value: transactions.filter((t) => t.merchant_decision === "ACCEPTED_WITH_RISK").length },
    { name: "Rejected", value: transactions.filter((t) => t.merchant_decision === "REJECTED").length },
    { name: "Pending", value: transactions.filter((t) => t.merchant_decision === "PENDING").length },
  ].filter((d) => d.value > 0);

  const scoreDistData = [
    { range: "0–20", count: transactions.filter((t) => t.confidence_score <= 20).length },
    { range: "21–40", count: transactions.filter((t) => t.confidence_score > 20 && t.confidence_score <= 40).length },
    { range: "41–60", count: transactions.filter((t) => t.confidence_score > 40 && t.confidence_score <= 60).length },
    { range: "61–80", count: transactions.filter((t) => t.confidence_score > 60 && t.confidence_score <= 80).length },
    { range: "81–100", count: transactions.filter((t) => t.confidence_score > 80).length },
  ];

  const trendData = transactions.slice(0, 15).reverse().map((t, i) => ({
    i: i + 1,
    score: Math.round(t.confidence_score),
    label: t.txn_id.slice(-6),
  }));

  const total = transactions.length;
  const unconfirmed = transactions.filter((t) => t.status === "UNCONFIRMED").length;
  const fraudFlagged = transactions.filter((t) => t.fraud_flags.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Transactions", value: total, color: "text-indigo-400", Icon: TrendingUp },
          { label: "Unconfirmed (Offline)", value: unconfirmed, color: "text-orange-400", Icon: WifiOff },
          { label: "Fraud Flagged", value: fraudFlagged, color: "text-red-400", Icon: Shield },
          { label: "Trust Profiles", value: profiles?.length ?? 0, color: "text-green-400", Icon: Users },
        ].map(({ label, value, color, Icon }) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="space-y-4">
          {/* Network toggle */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Network Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gray-800/60 border border-gray-700/60 p-3">
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
                  <div>
                    <p className="text-sm text-white font-medium">Status</p>
                    <p className="text-xs text-gray-500">
                      {networkStatus?.updated_at ? new Date(networkStatus.updated_at).toLocaleTimeString() : "—"}
                    </p>
                  </div>
                </div>
                <Badge className={isOnline ? "bg-green-900 text-green-300 border border-green-700/60" : "bg-red-900 text-red-300 border border-red-700/60"}>
                  {networkStatus?.mode ?? "UNKNOWN"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" disabled={isOnline || setNetworkStatus.isPending}
                  onClick={() => setNetworkStatus.mutate({ data: { mode: "ONLINE" } })}
                  className="bg-green-800 hover:bg-green-700 text-white disabled:opacity-40 text-xs h-9">
                  <Wifi className="w-3 h-3 mr-1.5" /> Go Online
                </Button>
                <Button size="sm" disabled={!isOnline || setNetworkStatus.isPending}
                  onClick={() => setNetworkStatus.mutate({ data: { mode: "OFFLINE" } })}
                  className="bg-red-900 hover:bg-red-800 text-white disabled:opacity-40 text-xs h-9">
                  <WifiOff className="w-3 h-3 mr-1.5" /> Go Offline
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Engine */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                Sync Engine
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Reconcile offline decisions with the bank. Updates trust memory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-indigo-700 hover:bg-indigo-600 text-white h-9 text-xs font-medium" disabled={syncTxns.isPending}
                onClick={() => syncTxns.mutate({ data: {} })}>
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncTxns.isPending ? "animate-spin" : ""}`} />
                {syncTxns.isPending ? "Syncing…" : "Sync Transactions"}
              </Button>
              {!isOnline && (
                <Button variant="outline" className="w-full border-gray-700 text-gray-400 hover:bg-gray-800 text-xs h-8"
                  disabled={syncTxns.isPending} onClick={() => syncTxns.mutate({ data: { force: true } })}>
                  Force Sync (Offline Override)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Fraud Simulator */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" />
                Fraud Simulator
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Test the trust engine with simulated attack patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                {(["DOUBLE_ATTEMPT", "RAPID_TRANSACTIONS", "FAKE_RETRY"] as const).map((type) => (
                  <button key={type} onClick={() => setFraudType(type)}
                    className={`w-full text-left text-xs px-3 py-2.5 rounded-lg border transition-all ${
                      fraudType === type
                        ? "bg-red-950/60 border-red-700/60 text-red-300"
                        : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}>
                    {type === "DOUBLE_ATTEMPT" && "🔁 Double Attempt — Duplicate payment attempt"}
                    {type === "RAPID_TRANSACTIONS" && "⚡ Rapid Fire — 5 transactions in 1 minute"}
                    {type === "FAKE_RETRY" && "🎭 Fake Retry — Suspected replay attack"}
                  </button>
                ))}
              </div>
              <Button className="w-full bg-red-900 hover:bg-red-800 text-white text-xs h-9 font-medium"
                disabled={simulateFraud.isPending} onClick={() => simulateFraud.mutate({ data: { type: fraudType } })}>
                <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                {simulateFraud.isPending ? "Simulating…" : "Trigger Attack"}
              </Button>
            </CardContent>
          </Card>

          {/* User Trust Profiles */}
          {profiles && profiles.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Trust Memory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {profiles.map((p) => (
                    <div key={p.customer_id} className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">{p.customer_name}</p>
                        <p className="text-xs text-gray-600">{p.total_transactions} txns · ₹{Number(p.avg_amount).toFixed(0)} avg</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.fraud_count > 0 && (
                          <span className="text-xs text-red-400 font-bold">⚠ {p.fraud_count}</span>
                        )}
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.reliability_score >= 75 ? "bg-green-900/50 text-green-400"
                            : p.reliability_score >= 50 ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-red-900/50 text-red-400"
                        }`}>
                          {Number(p.reliability_score).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts + Logs Column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Charts */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Trust Score Distribution */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={scoreDistData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Status Pie */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-10">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                          paddingAngle={3} dataKey="value" nameKey="name">
                          {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {statusData.map((d, i) => (
                      <span key={d.name} className="text-xs flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-500">{d.name}</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Score Trend */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-10">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="i" tick={{ fontSize: 10, fill: "#6b7280" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                        <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Logs */}
          <Card className="bg-gray-900 border-gray-800 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400" />
                  Live System Logs
                </CardTitle>
                <Button size="sm" variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-7 px-3 text-xs"
                  disabled={clearLogs.isPending} onClick={() => clearLogs.mutate()}>
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
              <CardDescription className="text-gray-600 text-xs">
                Real-time event stream from the ArthaSetu Trust Orchestration Layer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!logs || logs.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-10">No logs yet. Perform some actions to see events here.</p>
              ) : (
                <div className="space-y-0.5 max-h-96 overflow-y-auto font-mono text-xs pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/60 transition-colors group">
                      <span className="text-gray-600 shrink-0 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <LogLevelBadge level={log.level} />
                      <span className={
                        log.level === "ERROR" ? "text-red-300" :
                        log.level === "WARNING" ? "text-yellow-300" :
                        log.level === "SYNC" ? "text-purple-300" :
                        "text-gray-300"
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
