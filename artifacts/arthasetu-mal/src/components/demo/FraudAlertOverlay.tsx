import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";

interface FraudAlertOverlayProps {
  isVisible: boolean;
}

export function FraudAlertOverlay({ isVisible }: FraudAlertOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 pointer-events-none rounded-xl overflow-hidden"
        >
          {/* Flashing Red Edge */}
          <motion.div 
            animate={{ 
              boxShadow: ["inset 0 0 0px 0px rgba(239,68,68,0)", "inset 0 0 100px 10px rgba(239,68,68,0.5)", "inset 0 0 0px 0px rgba(239,68,68,0)"] 
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0"
          />

          {/* Alert Banner */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2"
          >
            <div className="bg-red-950/90 backdrop-blur-md border border-red-500 text-red-100 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.6)]">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider">
                Suspicious Activity Detected
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
