import React from "react";
import { Play, Pause, ChevronRight, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useDemo } from "@/context/DemoContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function DemoControlPanel() {
  const { 
    isRunning, 
    isCleanMode, 
    isCompleted,
    startDemo, 
    pauseDemo, 
    nextStep, 
    setCleanMode,
    resetDemo 
  } = useDemo();

  // If in clean mode AND running/completed, we might want to hide the panel entirely,
  // or make it an invisible hover-target. Let's just make it very subtle or hide it.
  if (isCleanMode && isRunning) {
    return null; // hide completely for clean video recording if it's already running
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-800 p-4 rounded-xl shadow-2xl flex flex-col gap-4 w-72 transition-opacity ${isCleanMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-tight">Demo Controls</h3>
        <div className="flex items-center space-x-2">
          <Switch 
            id="clean-mode" 
            checked={isCleanMode} 
            onCheckedChange={setCleanMode}
            className="data-[state=checked]:bg-indigo-500"
          />
          <Label htmlFor="clean-mode" className="text-xs text-gray-400 cursor-pointer flex items-center gap-1">
            {isCleanMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            Clean
          </Label>
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning ? (
          <Button onClick={pauseDemo} variant="secondary" className="flex-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 hover:text-yellow-400 border border-yellow-500/20">
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : isCompleted ? (
          <Button onClick={resetDemo} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart
          </Button>
        ) : (
          <Button onClick={startDemo} className="flex-1 bg-green-600 hover:bg-green-500 text-white">
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}
        
        <Button 
          onClick={nextStep} 
          disabled={isCompleted}
          variant="outline" 
          className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          Skip
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
