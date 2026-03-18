import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TrustScoreMeterProps {
  score: number; // 0 to 100
  animated?: boolean;
}

export function TrustScoreMeter({ score, animated = true }: TrustScoreMeterProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    // animate counter
    const duration = 1000;
    const steps = 20;
    const stepTime = duration / steps;
    const increment = (score - displayScore) / steps;

    let current = displayScore;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= score) || (increment < 0 && current <= score)) {
        current = score;
        clearInterval(timer);
      }
      setDisplayScore(current);
    }, stepTime);

    return () => clearInterval(timer);
  }, [score, animated]);

  // Determine colors based on score
  const isHigh = score >= 80;
  const isMedium = score >= 50 && score < 80;
  // const isLow = score < 50;

  const colorStr = isHigh ? "rgb(34, 197, 94)" : isMedium ? "rgb(234, 179, 8)" : "rgb(239, 68, 68)";
  const bgStr = isHigh ? "rgba(34, 197, 94, 0.2)" : isMedium ? "rgba(234, 179, 8, 0.2)" : "rgba(239, 68, 68, 0.2)";

  const strokeDasharray = `${(displayScore / 100) * 283} 283`; // 2 * PI * r (r=45) = 282.7

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {/* Glow wrapper */}
      <div 
        className="absolute inset-0 blur-2xl rounded-full transition-colors duration-1000" 
        style={{ backgroundColor: bgStr, opacity: 0.5 }}
      />
      
      <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
        <circle
          className="text-gray-800 stroke-current"
          strokeWidth="8"
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
        ></circle>
        
        {animated ? (
          <motion.circle
            className="stroke-current transition-colors duration-1000"
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            style={{ color: colorStr }}
            initial={{ strokeDasharray: "0 283" }}
            animate={{ strokeDasharray }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ) : (
          <circle
            className="stroke-current transition-colors duration-1000"
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            style={{ color: colorStr, strokeDasharray }}
          />
        )}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-3xl font-black text-white tabular-nums drop-shadow-md">
          {Math.round(displayScore)}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
          Trust Score
        </span>
      </div>
    </div>
  );
}
