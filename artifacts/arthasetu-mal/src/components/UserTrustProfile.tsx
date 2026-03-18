import type { UserProfile } from "@/lib/types";
import { Shield, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

interface UserTrustProfileProps {
  profile: UserProfile | null;
  loading?: boolean;
}

function ReliabilityRing({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const size = 64;
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{score.toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function UserTrustProfile({ profile, loading }: UserTrustProfileProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
        <div className="h-3 bg-gray-700 rounded w-full mb-2" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
      </div>
    );
  }

  if (!profile || profile.total_transactions === 0) {
    return (
      <div className="rounded-lg bg-gray-800/40 border border-gray-700/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-500">Trust Memory</span>
        </div>
        <p className="text-xs text-gray-600">No transaction history for this customer.</p>
      </div>
    );
  }

  const reliabilityScore = profile.reliability_score;
  const successRate = profile.total_transactions > 0
    ? ((profile.success_count / profile.total_transactions) * 100).toFixed(0)
    : "0";

  const trustLevel = reliabilityScore >= 75 ? { label: "Trusted", color: "text-green-400", bg: "bg-green-900/30 border-green-800/50" }
    : reliabilityScore >= 50 ? { label: "Moderate", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-800/50" }
    : { label: "High Risk", color: "text-red-400", bg: "bg-red-900/30 border-red-800/50" };

  return (
    <div className="rounded-lg bg-gray-800/40 border border-gray-700/60 p-4">
      <div className="flex items-start gap-3">
        <ReliabilityRing score={reliabilityScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white truncate">{profile.customer_name}</p>
              <p className="text-xs text-gray-500">{profile.customer_id}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${trustLevel.color} ${trustLevel.bg}`}>
              {trustLevel.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Reliability: {reliabilityScore.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <div className="text-center">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-green-400">{profile.success_count}</p>
          <p className="text-xs text-gray-600">Success</p>
        </div>
        <div className="text-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-red-400">{profile.fraud_count}</p>
          <p className="text-xs text-gray-600">Fraud</p>
        </div>
        <div className="text-center">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-white">{profile.total_transactions}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="text-center">
          <DollarSign className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-white">
            {profile.avg_amount >= 1000
              ? `₹${(profile.avg_amount / 1000).toFixed(1)}k`
              : `₹${profile.avg_amount.toFixed(0)}`}
          </p>
          <p className="text-xs text-gray-600">Avg</p>
        </div>
      </div>
    </div>
  );
}
