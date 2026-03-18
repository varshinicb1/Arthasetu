import type { ScoreBreakdownItem } from "@/lib/types";

interface TrustBreakdownProps {
  score: number;
  level: string;
  proofStrength: string;
  breakdown: ScoreBreakdownItem[];
}

const levelConfig = {
  HIGH: { color: "#22c55e", bg: "bg-green-900/40", text: "text-green-400", border: "border-green-800/60", label: "High Trust" },
  MEDIUM: { color: "#eab308", bg: "bg-yellow-900/40", text: "text-yellow-400", border: "border-yellow-800/60", label: "Medium Trust" },
  LOW: { color: "#ef4444", bg: "bg-red-900/40", text: "text-red-400", border: "border-red-800/60", label: "Low Trust" },
};

const proofConfig = {
  HIGH: { color: "text-green-400", bg: "bg-green-900/30 border-green-800/50", label: "Strong Proof ✔" },
  MEDIUM: { color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-800/50", label: "Moderate Proof ~" },
  LOW: { color: "text-red-400", bg: "bg-red-900/30 border-red-800/50", label: "Weak Proof ✗" },
};

function TrustRing({ score, level }: { score: number; level: string }) {
  const cfg = levelConfig[level as keyof typeof levelConfig] ?? levelConfig.MEDIUM;
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={cfg.color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${cfg.text}`}>{score.toFixed(0)}</span>
          <span className="text-xs text-gray-500 font-medium">/100</span>
        </div>
      </div>
      <div className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
        {cfg.label}
      </div>
    </div>
  );
}

export default function TrustBreakdown({ score, level, proofStrength, breakdown }: TrustBreakdownProps) {
  const proof = proofConfig[proofStrength as keyof typeof proofConfig] ?? proofConfig.MEDIUM;
  const positives = breakdown.filter((b) => b.delta > 0);
  const negatives = breakdown.filter((b) => b.delta < 0);
  const maxDelta = Math.max(...breakdown.map((b) => Math.abs(b.delta)), 1);

  return (
    <div className="space-y-4">
      {/* Score Ring + Proof Strength */}
      <div className="flex items-center gap-6">
        <TrustRing score={score} level={level} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Trust Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    level === "HIGH" ? "bg-green-500" : level === "MEDIUM" ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-xs font-bold w-8 text-right ${
                level === "HIGH" ? "text-green-400" : level === "MEDIUM" ? "text-yellow-400" : "text-red-400"
              }`}>{score.toFixed(0)}%</span>
            </div>
          </div>

          {/* Proof Strength */}
          <div className={`rounded-lg border px-3 py-2 ${proof.bg}`}>
            <p className={`text-xs font-bold ${proof.color}`}>{proof.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cryptographic signature verified</p>
          </div>
        </div>
      </div>

      {/* Breakdown Factors */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Score Breakdown</p>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {breakdown.filter(b => b.label !== "Base Score").map((item, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <div className="w-28 shrink-0">
                <div
                  className={`h-1.5 rounded-full ${item.delta > 0 ? "bg-green-500/40" : "bg-red-500/40"}`}
                  style={{ width: `${(Math.abs(item.delta) / maxDelta) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-mono w-9 shrink-0 text-right font-bold ${
                item.delta > 0 ? "text-green-400" : "text-red-400"
              }`}>
                {item.delta > 0 ? "+" : ""}{item.delta}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{item.label}</p>
                <p className="text-xs text-gray-600 truncate">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-950/40 rounded-lg px-3 py-2 border border-green-900/40">
          <p className="text-xs text-gray-500">Positive Signals</p>
          <p className="text-sm font-bold text-green-400">
            +{positives.reduce((s, b) => s + b.delta, 0)}
          </p>
          <p className="text-xs text-gray-600">{positives.filter(b => b.label !== "Base Score").length} factors</p>
        </div>
        <div className="bg-red-950/40 rounded-lg px-3 py-2 border border-red-900/40">
          <p className="text-xs text-gray-500">Risk Signals</p>
          <p className="text-sm font-bold text-red-400">
            {negatives.reduce((s, b) => s + b.delta, 0)}
          </p>
          <p className="text-xs text-gray-600">{negatives.length} factors</p>
        </div>
      </div>
    </div>
  );
}
