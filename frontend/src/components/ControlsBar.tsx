import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Sliders, ChevronDown } from 'lucide-react';
import { EXPERIMENT_RUNS } from '../data/mockExperiments';

interface ControlsBarProps {
  selectedExperimentId: string;
  onSelectExperiment: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  currentStep: number;
  totalSteps: number;
  onScrubStep: (step: number) => void;
  stepTrainCrossing: number | null;
  stepValCrossing: number | null;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  selectedExperimentId,
  onSelectExperiment,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  onChangeSpeed,
  currentStep,
  totalSteps,
  onScrubStep,
  stepTrainCrossing,
  stepValCrossing,
}) => {
  const speeds = [1, 5, 20, 50, 100];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScrubStep(parseInt(e.target.value, 10));
  };

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Experiment Selector & Playback Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Experiment Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[#6e7681] text-[10px] uppercase tracking-wider hidden sm:inline">
              SELECT RUN:
            </span>
            <div className="relative">
              <select
                value={selectedExperimentId}
                onChange={(e) => onSelectExperiment(e.target.value)}
                className="appearance-none bg-[#0f141f] border border-[#273247] hover:border-[#384663] text-[#e6edf3] font-mono text-xs px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {Object.values(EXPERIMENT_RUNS).map((run) => (
                  <option key={run.metadata.id} value={run.metadata.id}>
                    {run.metadata.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="h-4 w-px bg-[#1c2333] hidden sm:block" />

          {/* Controls: Start, Stop, Reset */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 border font-semibold tracking-wider text-xs transition-all cursor-pointer ${
                isPlaying
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                  : 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START</span>
                </>
              )}
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#273247] hover:border-[#384663] bg-[#101520] hover:bg-[#161c2b] text-[#8b949e] hover:text-[#e6edf3] transition-all cursor-pointer"
              title="Reset experiment to step 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#1c2333] hidden sm:block" />

          {/* Playback Speed Multipliers */}
          <div className="flex items-center gap-1 border border-[#1e2638] bg-[#0c1017] p-0.5">
            <span className="text-[10px] text-[#6e7681] px-1.5 flex items-center gap-1">
              <FastForward className="w-3 h-3 text-[#57606a]" />
              SPEED:
            </span>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-0.5 text-[10px] transition-colors cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-[#232d40] text-emerald-400 font-bold'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Step Scrubber & Quick Milestones */}
        <div className="flex-1 lg:max-w-md flex flex-col justify-center">
          <div className="flex items-center justify-between text-[11px] mb-1 text-[#8b949e]">
            <span className="flex items-center gap-1 text-[#c9d1d9]">
              <Sliders className="w-3 h-3 text-[#57606a]" />
              STEP SCRUBBER:
            </span>
            <span>
              <strong className="text-amber-400">{currentStep.toLocaleString()}</strong> /{' '}
              {totalSteps.toLocaleString()}
            </span>
          </div>

          <input
            type="range"
            min="100"
            max={totalSteps}
            step={totalSteps > 1000 ? 100 : 1}
            value={currentStep}
            onChange={handleSliderChange}
            className="w-full accent-amber-400 bg-[#161d2b] h-1.5 cursor-pointer appearance-none rounded-none"
          />

          {/* Quick seek markers */}
          <div className="flex items-center justify-between text-[10px] text-[#57606a] mt-1.5">
            <button
              onClick={() => onScrubStep(100)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Step 0 (Init)
            </button>
            {stepTrainCrossing && (
              <button
                onClick={() => onScrubStep(stepTrainCrossing)}
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                Step {stepTrainCrossing.toLocaleString()} (Memorize)
              </button>
            )}
            {stepValCrossing && (
              <button
                onClick={() => onScrubStep(stepValCrossing)}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Step {stepValCrossing.toLocaleString()} (Grok)
              </button>
            )}
            <button
              onClick={() => onScrubStep(totalSteps)}
              className="hover:text-[#c9d1d9] transition-colors cursor-pointer"
            >
              Step {totalSteps.toLocaleString()} (End)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

