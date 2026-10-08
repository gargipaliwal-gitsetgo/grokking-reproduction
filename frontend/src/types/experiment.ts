export interface MetricPoint {
  step: number;
  train_acc: number;
  val_acc: number;
  train_mse: number;
  val_mse: number;
}

export type LearningPhase = 'INITIALIZATION' | 'MEMORIZATION' | 'GENERALIZATION' | 'CONFUSION';

export interface ExperimentMetadata {
  id: string;
  name: string;
  subtitle: string;
  task: 'regression' | 'scalar';
  p: number;
  n_train: number;
  n_val: number;
  steps: number;
  seed: number;
  target_seed: number;
  device: string;
  embed_lr: number;
  decoder_lr: number;
  embed_wd: number;
  decoder_wd: number;
  init_scale: number;
  batch_size: number;
  acc_threshold: number;
  paper_phase_horizon: number;
  paper_grokking_delay: number;
  step_train_acc_threshold: number | null;
  step_val_acc_threshold: number | null;
  paper_phase: LearningPhase;
  note: string;
  identifiable_under_table1: boolean;
  truncated_vs_paper_horizon: boolean;
  delay_steps: number | null;
}

export interface ExperimentRun {
  metadata: ExperimentMetadata;
  metrics: MetricPoint[];
}

export interface DashboardFilterState {
  stepRange: [number, number];
  isLive: boolean;
  playbackSpeed: number; // 1, 5, 20, 100
  logScaleLoss: boolean;
  showThresholdLine: boolean;
  showGapArea: boolean;
  hoveredStep: number | null;
}

