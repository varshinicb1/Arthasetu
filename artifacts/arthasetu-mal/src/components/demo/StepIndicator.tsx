import React from "react";
import { useDemo, DEMO_STEPS } from "@/context/DemoContext";

export function StepIndicator() {
  const { currentStepIndex, isCleanMode } = useDemo();

  if (isCleanMode) return null; // completely hide the top indicator in clean mode maybe?
  // Actually, keeping a subtle indicator even in clean mode might be good for a demo video, 
  // but let's hide it if clean mode hides "debug info". We'll make it part of the UI.
  // Wait, if we hide the indicator, the user doesn't know the step.
  // The plan said "Top bar showing steps 1-7". Let's show it always but maybe cleaner.

  return (
    <div className="w-full bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {DEMO_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isPast = index < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex flex-col flex-none transition-colors duration-300 ${
                    isActive ? "opacity-100" : isPast ? "opacity-60" : "opacity-30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" : 
                      isPast ? "bg-green-500/20 text-green-400" : 
                      "bg-gray-800 text-gray-500"
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${
                      isActive ? "text-indigo-400" : isPast ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  <div className={`h-1 w-full rounded-full transition-all duration-500 ${
                    isActive ? "bg-indigo-500" : isPast ? "bg-green-500/30" : "bg-gray-800"
                  }`} />
                </div>
                
                {/* Connector line */}
                {index < DEMO_STEPS.length - 1 && (
                  <div className={`flex-1 h-px min-w-[20px] mx-2 self-end mb-0.5 transition-colors ${
                    isPast ? "bg-green-500/30" : "bg-gray-800"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
