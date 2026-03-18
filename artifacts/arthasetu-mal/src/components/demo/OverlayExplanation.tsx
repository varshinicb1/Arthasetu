import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemo } from "@/context/DemoContext";

interface OverlayExplanationProps {
  stepIndex: number; // The index of the step this explanation belongs to
  align?: "left" | "right" | "center" | "bottom" | "top";
  children?: React.ReactNode;
}

export function OverlayExplanation({ stepIndex, align = "center", children }: OverlayExplanationProps) {
  const { currentStepIndex, currentStep, isCleanMode } = useDemo();

  // Highlight only when the current step matches
  const isVisible = stepIndex === currentStepIndex && !isCleanMode;

  const positionClasses = {
    left: "left-4 top-1/2 -translate-y-1/2",
    right: "right-4 top-1/2 -translate-y-1/2",
    center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-4 left-1/2 -translate-x-1/2",
    top: "top-4 left-1/2 -translate-x-1/2"
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className={`absolute z-30 ${positionClasses[align]} max-w-sm pointer-events-none`}
        >
          <div className="bg-indigo-900/90 backdrop-blur-md border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)] rounded-2xl p-4 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full" />
            
            <div className="relative flex items-start gap-3">
              <div className="text-3xl">{currentStep.emoji}</div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">{currentStep.title}</h4>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  {children || currentStep.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
