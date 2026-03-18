import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRunDemo, useSyncTransactions, useSetNetworkStatus } from "@workspace/api-client-react";

export interface DemoStep {
  id: number;
  title: string;
  description: string;
  emoji: string;
  category: "setup" | "transaction" | "fraud" | "decision" | "sync";
  autoNext?: number;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: 1, title: "Initializing Demo", description: "Setting up customer trust profiles...", emoji: "⚙️", category: "setup", autoNext: 2000 },
  { id: 2, title: "Network Goes Offline", description: "Simulating network failure. ArthaSetu activates offline mode.", emoji: "📡", category: "setup", autoNext: 2500 },
  { id: 3, title: "Normal Payment", description: "Priya initiates ₹1,200. Trust score: 88/100. Cryptographic proof generated.", emoji: "💰", category: "transaction", autoNext: 3000 },
  { id: 4, title: "Trust Engine Analyzing", description: "ArthaSetu checks user reliability, amount risk, & proof validity.", emoji: "🧠", category: "transaction", autoNext: 2500 },
  { id: 5, title: "High-Risk Flagged", description: "Rahul attempts ₹15,000. Score: 18/100. Offline + high amount = DANGER.", emoji: "🚨", category: "fraud", autoNext: 3000 },
  { id: 6, title: "Merchant Reviews", description: "Merchant sees all offline trust scores. Accept or Reject?", emoji: "🏪", category: "decision", autoNext: 3500 },
  { id: 7, title: "Network Restored", description: "Connectivity returns. Syncing decisions with the bank.", emoji: "📶", category: "sync", autoNext: 2500 },
];

interface DemoContextType {
  currentStepIndex: number;
  currentStep: DemoStep;
  isRunning: boolean;
  isCleanMode: boolean;
  isCompleted: boolean;
  startDemo: () => void;
  pauseDemo: () => void;
  nextStep: () => void;
  setCleanMode: (clean: boolean) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoTimer, setAutoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/status"] });
  }, [queryClient]);

  const runDemo = useRunDemo({ mutation: { onSuccess: invalidateAll } });
  const syncTxns = useSyncTransactions({ mutation: { onSuccess: invalidateAll } });
  const setNetwork = useSetNetworkStatus({ mutation: { onSuccess: invalidateAll } });

  const currentStep = DEMO_STEPS[currentStepIndex];

  const scheduleNext = useCallback((ms: number) => {
    const t = setTimeout(() => {
      setCurrentStepIndex((s) => {
        const next = s + 1;
        if (next >= DEMO_STEPS.length) {
          setIsCompleted(true);
          setIsRunning(false);
          return s;
        }
        return next;
      });
    }, ms);
    setAutoTimer(t);
    return t;
  }, []);

  useEffect(() => {
    return () => { if (autoTimer) clearTimeout(autoTimer); };
  }, [autoTimer]);

  useEffect(() => {
    if (!isRunning || isCompleted) return;

    // Trigger API based on step index 
    if (currentStepIndex === 0) {
      runDemo.mutate(undefined); // Init Demo
    } else if (currentStepIndex === 1) {
      setNetwork.mutate({ data: { mode: "OFFLINE" } });
    } else if (currentStepIndex === 6) { // Step 7: Network Restored
      setNetwork.mutate({ data: { mode: "ONLINE" } });
      setTimeout(() => {
         syncTxns.mutate({ data: { force: true } });
      }, 1000); // trigger sync shortly after online
    }

    if (currentStep.autoNext && isRunning) {
      scheduleNext(currentStep.autoNext);
    }
  }, [currentStepIndex, isRunning, isCompleted, currentStep.autoNext]);

  const startDemo = () => {
    setIsRunning(true);
    setIsCompleted(false);
    if (currentStepIndex >= DEMO_STEPS.length - 1) {
      setCurrentStepIndex(0);
    }
  };

  const pauseDemo = () => {
    setIsRunning(false);
    if (autoTimer) clearTimeout(autoTimer);
  };

  const nextStep = () => {
    if (autoTimer) clearTimeout(autoTimer);
    const next = currentStepIndex + 1;
    if (next >= DEMO_STEPS.length) {
      setIsCompleted(true);
      setIsRunning(false);
      return;
    }
    setCurrentStepIndex(next);
  };

  const resetDemo = () => {
    pauseDemo();
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  return (
    <DemoContext.Provider
      value={{
        currentStepIndex,
        currentStep,
        isRunning,
        isCleanMode,
        isCompleted,
        startDemo,
        pauseDemo,
        nextStep,
        setCleanMode: setIsCleanMode,
        resetDemo
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
