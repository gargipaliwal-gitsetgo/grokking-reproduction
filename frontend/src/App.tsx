import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EXPERIMENT_RUNS, DEFAULT_EXPERIMENT_ID } from './data/mockExperiments';
import { ExperimentRun, MetricPoint } from './types/experiment';
import { analyzeRunPhases } from './services/metricsLoader';
import { Header } from './components/Header';
import { MetadataPanel } from './components/MetadataPanel';
import { PhaseIndicator } from './components/PhaseIndicator';
import { MetricsCards } from './components/MetricsCards';
import { AccuracyChart } from './components/AccuracyChart';
import { MSEChart } from './components/MSEChart';
import { ControlsBar } from './components/ControlsBar';
import { RunDetails } from './components/RunDetails';
import { UploadModal } from './components/UploadModal';
import { ApiConnectModal } from './components/ApiConnectModal';

export const App: React.FC = () => {
  // Active experiment run
  const [currentRun, setCurrentRun] = useState<ExperimentRun>(
    EXPERIMENT_RUNS[DEFAULT_EXPERIMENT_ID]
  );
  const [selectedExpId, setSelectedExpId] = useState<string>(DEFAULT_EXPERIMENT_ID);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5);
  const [currentStep, setCurrentStep] = useState<number>(() => {
    // Start at final step by default so user immediately sees completed experiment data
    const last = currentRun.metrics.length > 0 ? currentRun.metrics[currentRun.metrics.length - 1].step : 100000;
    return last;
  });

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const totalSteps = useMemo(() => {
    if (currentRun.metrics.length === 0) return currentRun.metadata.steps;
    return currentRun.metrics[currentRun.metrics.length - 1].step;
  }, [currentRun]);

  // Find current metric point based on currentStep
  const currentMetrics = useMemo<MetricPoint>(() => {
    if (currentRun.metrics.length === 0) {
      return { step: 0, train_acc: 0, val_acc: 0, train_mse: 1.0, val_mse: 1.0 };
    }

    // Binary search or find closest
    let closest = currentRun.metrics[0];
    let minDiff = Math.abs(closest.step - currentStep);

    for (let i = 1; i < currentRun.metrics.length; i++) {
      const diff = Math.abs(currentRun.metrics[i].step - currentStep);
      if (diff < minDiff) {
        minDiff = diff;
        closest = currentRun.metrics[i];
      }
      if (currentRun.metrics[i].step > currentStep) break;
    }

    return closest;
  }, [currentRun, currentStep]);

  // Dynamically analyze phase at currentStep
  const phaseAnalysis = useMemo(() => {
    return analyzeRunPhases(
      currentRun.metrics,
      currentStep,
      currentRun.metadata.acc_threshold
    );
  }, [currentRun, currentStep]);

  // Handle switching experiment presets
  const handleSelectExperiment = (id: string) => {
    setSelectedExpId(id);
    const run = EXPERIMENT_RUNS[id];
    if (run) {
      setCurrentRun(run);
      setIsPlaying(false);
      const maxStep = run.metrics.length > 0 ? run.metrics[run.metrics.length - 1].step : run.metadata.steps;
      setCurrentStep(maxStep);
    }
  };

  // Handle custom run loading
  const handleLoadCustomRun = (run: ExperimentRun) => {
    setCurrentRun(run);
    setSelectedExpId(run.metadata.id);
    setIsPlaying(false);
    const maxStep = run.metrics.length > 0 ? run.metrics[run.metrics.length - 1].step : run.metadata.steps;
    setCurrentStep(maxStep);
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        // Calculate step increment based on speed
        const stepIncrement = Math.max(100, Math.round(500 * (playbackSpeed / 5)));
        const next = prev + stepIncrement;

        if (next >= totalSteps) {
          setIsPlaying(false);
          return totalSteps;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, totalSteps, playbackSpeed]);

  const handleTogglePlay = () => {
    if (!isPlaying && currentStep >= totalSteps) {
      // If at end, loop to beginning
      setCurrentStep(100);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(100);
  };

  const handleScrubStep = (step: number) => {
    setCurrentStep(Math.max(100, Math.min(totalSteps, step)));
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e6edf3] research-grid-bg blueprint-lines selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Header */}
      <Header
        currentPhase={phaseAnalysis.currentPhase}
        isRunning={isPlaying}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleApiModal={() => setIsApiModalOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 2. Experiment Metadata Panel */}
        <section aria-label="Experiment Metadata">
          <MetadataPanel metadata={currentRun.metadata} currentStep={currentStep} />
        </section>

        {/* 7. Controls Bar (Top Placement for Instant Experimentation) */}
        <section aria-label="Experiment Controls">
          <ControlsBar
            selectedExperimentId={selectedExpId}
            onSelectExperiment={handleSelectExperiment}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onScrubStep={handleScrubStep}
            stepTrainCrossing={phaseAnalysis.stepTrainCrossing}
            stepValCrossing={phaseAnalysis.stepValCrossing}
          />
        </section>

        {/* 6. Learning Phase Indicator Pipeline */}
        <section aria-label="Learning Phase Pipeline">
          <PhaseIndicator
            currentPhase={phaseAnalysis.currentPhase}
            stepTrainCrossing={phaseAnalysis.stepTrainCrossing}
            stepValCrossing={phaseAnalysis.stepValCrossing}
            currentStep={currentStep}
            delaySteps={phaseAnalysis.delaySteps}
            note={currentRun.metadata.note}
          />
        </section>

        {/* 5. Current Metrics Readouts */}
        <section aria-label="Current Metrics">
          <MetricsCards currentMetrics={currentMetrics} />
        </section>

        {/* 3 & 4. Interactive Large Charts (Accuracy & MSE) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Experiment Charts">
          {/* 3. Accuracy Chart */}
          <div className="w-full">
            <AccuracyChart
              metrics={currentRun.metrics}
              currentStep={currentStep}
              accThreshold={currentRun.metadata.acc_threshold}
              onScrubStep={handleScrubStep}
            />
          </div>

          {/* 4. MSE Loss Chart */}
          <div className="w-full">
            <MSEChart
              metrics={currentRun.metrics}
              currentStep={currentStep}
              onScrubStep={handleScrubStep}
            />
          </div>
        </section>

        {/* 8. Run Details & Configuration */}
        <section aria-label="Run Configuration Details">
          <RunDetails metadata={currentRun.metadata} />
        </section>

        {/* Minimal Research Footer */}
        <footer className="pt-6 pb-8 border-t border-[#182030] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#6e7681] gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
            <span>GROKKING LAB &middot; NeurIPS 2022 Reproduction Environment</span>
          </div>
          <div>
            <span>Task: Non-Modular Addition Regression (\(p=10\))</span>
          </div>
        </footer>
      </main>

      {/* Upload & API Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onLoadRun={handleLoadCustomRun}
      />
      <ApiConnectModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onLoadRun={handleLoadCustomRun}
      />
    </div>
  );
};

export default App;
