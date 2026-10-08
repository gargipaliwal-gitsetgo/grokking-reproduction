import { ExperimentMetadata, ExperimentRun, MetricPoint, LearningPhase } from '../types/experiment';
import { EXPERIMENT_RUNS, DEFAULT_EXPERIMENT_ID } from '../data/mockExperiments';

export const PAPER_ACC_THRESHOLD = 0.9;
export const PAPER_PHASE_HORIZON = 100_000;
export const PAPER_GROKKING_DELAY = 1_000;

/**
 * Parse CSV text from metrics.csv into MetricPoint array.
 * Works with header formats:
 * - step,train_loss,val_loss,train_acc,val_acc (default from train.py)
 * - step,train_mse,val_mse,train_acc,val_acc
 */
export function parseMetricsCSV(csvText: string): MetricPoint[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim());

  const stepIdx = headers.indexOf('step');
  const trainLossIdx = headers.findIndex((h) => h === 'train_loss' || h === 'train_mse');
  const valLossIdx = headers.findIndex((h) => h === 'val_loss' || h === 'val_mse');
  const trainAccIdx = headers.indexOf('train_acc');
  const valAccIdx = headers.indexOf('val_acc');

  const points: MetricPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cols = row.split(',');

    const step = stepIdx !== -1 ? parseInt(cols[stepIdx], 10) : i * 100;
    const train_mse = trainLossIdx !== -1 ? parseFloat(cols[trainLossIdx]) : 0;
    const val_mse = valLossIdx !== -1 ? parseFloat(cols[valLossIdx]) : 0;
    const train_acc = trainAccIdx !== -1 ? parseFloat(cols[trainAccIdx]) : 0;
    const val_acc = valAccIdx !== -1 ? parseFloat(cols[valAccIdx]) : 0;

    if (!isNaN(step)) {
      points.push({
        step,
        train_acc: isNaN(train_acc) ? 0 : train_acc,
        val_acc: isNaN(val_acc) ? 0 : val_acc,
        train_mse: isNaN(train_mse) ? 0 : train_mse,
        val_mse: isNaN(val_mse) ? 0 : val_mse,
      });
    }
  }

  return points;
}

/**
 * Automatically determine phase from metrics trajectory based on NeurIPS 2022 Table 1.
 */
export function analyzeRunPhases(
  metrics: MetricPoint[],
  currentStep: number,
  accThreshold: number = PAPER_ACC_THRESHOLD
): {
  currentPhase: LearningPhase;
  stepTrainCrossing: number | null;
  stepValCrossing: number | null;
  delaySteps: number | null;
} {
  let stepTrainCrossing: number | null = null;
  let stepValCrossing: number | null = null;

  for (const pt of metrics) {
    if (pt.step > currentStep) break;

    if (stepTrainCrossing === null && pt.train_acc >= accThreshold) {
      stepTrainCrossing = pt.step;
    }
    if (stepValCrossing === null && pt.val_acc >= accThreshold) {
      stepValCrossing = pt.step;
    }
  }

  let delaySteps: number | null = null;
  if (stepTrainCrossing !== null && stepValCrossing !== null) {
    delaySteps = stepValCrossing - stepTrainCrossing;
  }

  let currentPhase: LearningPhase = 'INITIALIZATION';

  if (stepTrainCrossing !== null && stepValCrossing !== null) {
    // Both crossed threshold
    currentPhase = 'GENERALIZATION';
  } else if (stepTrainCrossing !== null && stepValCrossing === null) {
    // Train reached >= 90%, val hasn't yet
    currentPhase = 'MEMORIZATION';
  } else if (currentStep >= PAPER_PHASE_HORIZON && stepTrainCrossing === null) {
    currentPhase = 'CONFUSION';
  } else {
    currentPhase = 'INITIALIZATION';
  }

  return {
    currentPhase,
    stepTrainCrossing,
    stepValCrossing,
    delaySteps,
  };
}

/**
 * Create a new ExperimentRun from an uploaded or fetched CSV and config.
 */
export function createRunFromCSV(
  name: string,
  csvText: string,
  configOverrides?: Partial<ExperimentMetadata>
): ExperimentRun {
  const metrics = parseMetricsCSV(csvText);
  const lastStep = metrics.length > 0 ? metrics[metrics.length - 1].step : 100000;
  const analysis = analyzeRunPhases(metrics, lastStep);

  const metadata: ExperimentMetadata = {
    id: `custom_${Date.now()}`,
    name: name || 'Custom CSV Run',
    subtitle: 'Toy Non-Modular Addition (Loaded from CSV)',
    task: 'regression',
    p: 10,
    n_train: 45,
    n_val: 10,
    steps: lastStep,
    seed: 0,
    target_seed: 100,
    device: 'CPU',
    embed_lr: 0.001,
    decoder_lr: 0.001,
    embed_wd: 0.0,
    decoder_wd: 0.0,
    init_scale: 1.0,
    batch_size: 45,
    acc_threshold: PAPER_ACC_THRESHOLD,
    paper_phase_horizon: PAPER_PHASE_HORIZON,
    paper_grokking_delay: PAPER_GROKKING_DELAY,
    step_train_acc_threshold: analysis.stepTrainCrossing,
    step_val_acc_threshold: analysis.stepValCrossing,
    paper_phase: analysis.currentPhase,
    note: `Loaded from user metrics CSV. Current phase: ${analysis.currentPhase}`,
    identifiable_under_table1: lastStep >= PAPER_PHASE_HORIZON || analysis.currentPhase === 'GENERALIZATION',
    truncated_vs_paper_horizon: lastStep < PAPER_PHASE_HORIZON,
    delay_steps: analysis.delaySteps,
    ...configOverrides,
  };

  return { metadata, metrics };
}

/**
 * Fetch metrics from API or local endpoint.
 */
export async function fetchMetricsFromEndpoint(url: string): Promise<ExperimentRun> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch metrics from ${url}: ${response.statusText}`);
  }
  const text = await response.text();
  return createRunFromCSV('Live Streamed Run', text);
}

export function getDefaultExperiment(): ExperimentRun {
  return EXPERIMENT_RUNS[DEFAULT_EXPERIMENT_ID];
}

