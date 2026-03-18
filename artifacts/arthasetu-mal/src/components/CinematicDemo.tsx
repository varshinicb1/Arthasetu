import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useRunDemo, useSyncTransactions, useMerchantDecide, useSetNetworkStatus } from "@workspace/api-client-react";
import { Play, X, ChevronRight, Loader2, CheckCircle2, Wifi } from "lucide-react";

interface DemoStep {
  id: number;
  title: string;
  description: string;
  emoji: string;
  category: "setup" | "transaction" | "fraud" | "decision" | "sync";
  autoNext?: number;
}

const STEPS: DemoStep[] = [
  { id: 1, title: "Initializing Demo", description: "Setting up customer trust profiles and transaction scenarios…", emoji: "⚙️", category: "setup", autoNext: 2000 },
  { id: 2, title: "Network Goes Offline", description: "Simulating network failure. The bank cannot confirm payments. ArthaSetu activates offline mode.", emoji: "📡", category: "setup", autoNext: 2500 },
  { id: 3, title: "Normal Payment Captured", description: "Priya Sharma initiates ₹1,200. Trust score: 88/100 (HIGH). Cryptographic proof generated automatically.", emoji: "💰", category: "transaction", autoNext: 3000 },
  { id: 4, title: "Trust Engine Analyzing…", description: "ArthaSetu checks: user reliability (95%), amount risk, network status, transaction frequency, proof validity.", emoji: "🧠", category: "transaction", autoNext: 2500 },
  { id: 5, title: "High-Risk Payment Flagged", description: "Rahul Mehta attempts ₹15,000. Score: 18/100 (LOW). Fraud history + high amount + offline = DANGER.", emoji: "🚨", category: "fraud", autoNext: 3000 },
  { id: 6, title: "Merchant Reviews Decisions", description: "The merchant sees all trust scores and evidence. Switch to the Merchant tab to Accept or Reject.", emoji: "🏪", category: "decision", autoNext: 3500 },
  { id: 7, title: "Network Restored", description: "Connectivity returns. ArthaSetu syncs all pending offline decisions with the bank in real-time.", emoji: "📶", category: "sync", autoNext: 2500 },
  { id: 8, title: "Sync Engine Running", description: "Reconciling merchant decisions with actual bank outcomes. Trust memory profiles are updated.", emoji: "🔄", category: "sync", autoNext: 3000 },
  { id: 9, title: "Trust Memory Updated", description: "Priya Sharma's reliability score improves. Rahul Mehta flagged in trust memory for future transactions.", emoji: "🧩", category: "sync", autoNext: 2500 },
  { id: 10, title: "Demo Complete ✅", description: "ArthaSetu processed uncertain payments with confidence — even without bank confirmation. No revenue lost.", emoji: "🎉", category: "sync" },
];

const categoryColors = {
  setup: "border-blue-600 bg-blue-950/60",
  transaction: "border-indigo-600 bg-indigo-950/60",
  fraud: "border-red-600 bg-red-950/60",
  decision: "border-yellow-600 bg-yellow-950/60",
  sync: "border-green-600 bg-green-950/60",
};

interface CinematicDemoProps {
  onClose: () => void;
}

export default function CinematicDemo({ onClose }: CinematicDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [autoTimer, setAutoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const step = STEPS[currentStep];

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/status"] });
  }, [queryClient]);

  const runDemo = useRunDemo({ mutation: { onSuccess: invalidateAll } });
  const syncTxns = useSyncTransactions({ mutation: { onSuccess: invalidateAll } });
  const setNetwork = useSetNetworkStatus({ mutation: { onSuccess: invalidateAll } });

  const scheduleNext = useCallback((ms: number) => {
    const t = setTimeout(() => {
      setCurrentStep((s) => {
        const next = s + 1;
        if (next >= STEPS.length) { setCompleted(true); return s; }
        return next;
      });
    }, ms);
    setAutoTimer(t);
    return t;
  }, []);

  useEffect(() => {
    return () => { if (autoTimer) clearTimeout(autoTimer); };
  }, [autoTimer]);

  // Trigger API actions on specific steps
  useEffect(() => {
    if (!running) return;

    const s = STEPS[currentStep];

    if (currentStep === 0) {
      // Run demo to set up data
      runDemo.mutate(undefined);
    }

    if (currentStep === 6) {
      // Restore network online
      setNetwork.mutate({ data: { mode: "ONLINE" } });
    }

    if (currentStep === 7) {
      // Trigger sync
      syncTxns.mutate({ data: { force: true } });
    }

    // Auto advance
    if (s.autoNext) {
      scheduleNext(s.autoNext);
    }
  }, [currentStep, running]);

  const startDemo = async () => {
    setRunning(true);
    setCurrentStep(0);
    setCompleted(false);
  };

  const handleNext = () => {
    if (autoTimer) clearTimeout(autoTimer);
    const next = currentStep + 1;
    if (next >= STEPS.length) { setCompleted(true); return; }
    setCurrentStep(next);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center z-10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="rounded-2xl border border-gray-700 bg-gray-900 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 px-6 py-4 border-b border-indigo-800/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">ArthaSetu Demo Mode</h2>
                <p className="text-indigo-300 text-xs">Live simulation of the Trust Orchestration Layer</p>
              </div>
            </div>

            {/* Progress */}
            {running && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-indigo-400 mb-1">
                  <span>Step {currentStep + 1} of {STEPS.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-indigo-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step dots */}
          {running && (
            <div className="px-6 pt-4 flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < currentStep ? "bg-indigo-500" :
                    i === currentStep ? "bg-indigo-400 animate-pulse" :
                    "bg-gray-700"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {!running ? (
              /* Welcome screen */
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">🎬</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Cinematic Demo</h3>
                  <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                    Watch ArthaSetu handle uncertain payments, detect fraud, and make intelligent trust decisions — all in real-time.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left max-w-xs mx-auto">
                  {[
                    "✅ Trust Score Engine",
                    "🚨 Fraud Detection",
                    "🧠 Score Explainability",
                    "🔄 Offline Sync",
                  ].map((feat) => (
                    <div key={feat} className="text-xs text-gray-300 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                      {feat}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={startDemo}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-11 text-sm font-semibold rounded-xl"
                >
                  <Play className="w-4 h-4 mr-2 fill-white" />
                  Start Demo
                </Button>
              </div>
            ) : completed ? (
              /* Complete screen */
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">🎉</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Demo Complete!</h3>
                  <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                    ArthaSetu processed uncertain payments with confidence scoring, fraud detection, and offline sync — without losing a single sale.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Payments Processed", value: "3", color: "text-indigo-400" },
                    { label: "Fraud Detected", value: "1", color: "text-red-400" },
                    { label: "Revenue Protected", value: "₹1.2k", color: "text-green-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setRunning(false); setCompleted(false); }} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                    Restart
                  </Button>
                  <Button onClick={onClose} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Step content */
              <div className={`rounded-xl border p-4 mb-4 ${categoryColors[step.category]}`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{step.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">
                        Step {step.id} — {step.category}
                      </p>
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation when running */}
            {running && !completed && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  {step.autoNext ? `Auto-advancing in ${(step.autoNext / 1000).toFixed(0)}s…` : "Manual step"}
                </p>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white h-8 text-xs px-4"
                >
                  {currentStep === STEPS.length - 1 ? "Finish" : "Skip →"}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
