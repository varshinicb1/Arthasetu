import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useGetNetworkStatus } from "@workspace/api-client-react";
import CustomerPanel from "@/components/CustomerPanel";
import MerchantPanel from "@/components/MerchantPanel";
import { Wifi, WifiOff, ShieldCheck } from "lucide-react";
import { useDemo } from "@/context/DemoContext";
import { DemoControlPanel } from "@/components/demo/DemoControlPanel";
import { StepIndicator } from "@/components/demo/StepIndicator";

export default function Dashboard() {
  const { isCleanMode } = useDemo();

  const { data: networkStatus } = useGetNetworkStatus({
    query: { refetchInterval: 3000 },
  });

  const isOnline = networkStatus?.mode === "ONLINE";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header - hide in clean mode for maximum cinematic effect */}
      {!isCleanMode && (
        <header className="border-b border-gray-800/80 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white tracking-tight">ArthaSetu</h1>
                <p className="text-xs text-gray-500">Trust Orchestration Layer</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Network status */}
              {isOnline ? (
                <Badge className="bg-green-900/60 text-green-300 border border-green-700/60 flex items-center gap-1.5 px-3 py-1 text-xs">
                  <Wifi className="w-3 h-3" />
                  ONLINE
                </Badge>
              ) : (
                <Badge className="bg-red-900/60 text-red-300 border border-red-700/60 flex items-center gap-1.5 px-3 py-1 text-xs">
                  <WifiOff className="w-3 h-3" />
                  OFFLINE
                </Badge>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Step Indicator Top Bar */}
      <StepIndicator />

      {/* Main Split Screen */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 relative">
        {/* Customer Side */}
        <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative group transition-all duration-500">
           <div className="bg-gradient-to-r from-indigo-950/80 to-transparent border-b border-indigo-900/50 px-4 py-2 flex items-center justify-between">
             <h2 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
               <span className="text-xl">👤</span> Customer Profile
             </h2>
           </div>
           <div className="flex-1 p-4 relative overflow-y-auto">
             <CustomerPanel networkMode={networkStatus?.mode ?? "ONLINE"} />
           </div>
        </div>

        {/* Merchant Side */}
        <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative group transition-all duration-500">
           <div className="bg-gradient-to-r from-purple-950/80 to-transparent border-b border-purple-900/50 px-4 py-2 flex items-center justify-between">
             <h2 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
               <span className="text-xl">🏪</span> Merchant Dashboard
             </h2>
           </div>
           <div className="flex-1 p-4 relative overflow-y-auto">
             <MerchantPanel />
           </div>
        </div>
      </main>

      <DemoControlPanel />
    </div>
  );
}
