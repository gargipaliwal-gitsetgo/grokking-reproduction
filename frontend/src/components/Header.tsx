import React from 'react';
import { Activity, Radio, Cpu, UploadCloud } from 'lucide-react';
import { LearningPhase } from '../types/experiment';

interface HeaderProps {
  currentPhase: LearningPhase;
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  onOpenUpload: () => void;
  onToggleApiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPhase,
  isRunning,
  currentStep,
  totalSteps,
  onOpenUpload,
  onToggleApiModal,
}) => {
  const getStatusBadge = () => {
    if (isRunning) {
      return {
        text: 'TRAINING STREAM ACTIVE',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        dot: 'bg-amber-400 animate-pulse',
      };
    }
    if (currentPhase === 'GENERALIZATION') {
      return {
        text: 'GENERALIZATION ACHIEVED',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        dot: 'bg-emerald-400',
      };
    }
    if (currentPhase === 'MEMORIZATION') {
      return {
        text: 'MEMORIZATION REGIME',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        dot: 'bg-amber-400',
      };
    }
    if (currentPhase === 'CONFUSION') {
      return {
        text: 'CONFUSION (HORIZON EXCEEDED)',
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
        dot: 'bg-rose-400',
      };
    }
    return {
      text: 'INITIALIZATION PHASE',
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      dot: 'bg-cyan-400',
    };
  };

  const status = getStatusBadge();

  return (
    <header className="border-b border-[#1c2333] bg-[#090c13]/90 backdrop-blur px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex items-start md:items-center gap-4">
          <div className="h-10 w-10 border border-[#2a3449] bg-[#0f141d] flex items-center justify-center text-emerald-400 font-mono text-sm shadow-inner">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-[#e6edf3] font-mono m-0 flex items-center gap-2">
                GROKKING LAB
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 border border-[#232d40] bg-[#121722] text-[#8b949e] uppercase tracking-wider">
                NeurIPS 2022 Reproduction
              </span>
            </div>
            <p className="text-xs font-mono text-[#8b949e] tracking-wide mt-0.5">
              Toy Non-Modular Addition &middot; Representation Learning Analysis
            </p>
          </div>
        </div>

        {/* Status indicator and action buttons */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Step Progress Readout */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#1e2638] bg-[#0c1017] text-xs font-mono text-[#8b949e]">
            <Cpu className="w-3.5 h-3.5 text-[#57606a]" />
            <span>STEP:</span>
            <span className="text-[#e6edf3] font-semibold">{currentStep.toLocaleString()}</span>
            <span className="text-[#57606a]">/</span>
            <span>{totalSteps.toLocaleString()}</span>
          </div>

          {/* Experiment Status Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-mono tracking-wider transition-colors ${status.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span>{status.text}</span>
          </div>

          {/* Quick upload / API actions */}
          <button
            onClick={onOpenUpload}
            title="Upload custom metrics.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#263147] hover:border-[#384663] bg-[#101520] hover:bg-[#161c2b] text-xs font-mono text-[#c9d1d9] transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>LOAD CSV</span>
          </button>

          <button
            onClick={onToggleApiModal}
            title="Connect Live Python Script"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#263147] hover:border-[#384663] bg-[#101520] hover:bg-[#161c2b] text-xs font-mono text-[#c9d1d9] transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>PYTHON API</span>
          </button>
        </div>
      </div>
    </header>
  );
};

