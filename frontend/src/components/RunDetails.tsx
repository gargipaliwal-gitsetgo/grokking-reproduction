import React, { useState } from 'react';
import { ExperimentMetadata } from '../types/experiment';
import { Code, BookOpen, Cpu, Copy, Check, Terminal, FileText, ChevronRight } from 'lucide-react';

interface RunDetailsProps {
  metadata: ExperimentMetadata;
}

export const RunDetails: React.FC<RunDetailsProps> = ({ metadata }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'hyperparams' | 'json' | 'python_api'>('architecture');
  const [copied, setCopied] = useState(false);

  const rawConfigJson = JSON.stringify(
    {
      experiment: metadata.id,
      task: metadata.task,
      seed: metadata.seed,
      target_seed: metadata.target_seed,
      steps: metadata.steps,
      embed_lr: metadata.embed_lr,
      decoder_lr: metadata.decoder_lr,
      embed_wd: metadata.embed_wd,
      decoder_wd: metadata.decoder_wd,
      init_scale: metadata.init_scale,
      batch_size: metadata.batch_size,
      p: metadata.p,
      n_train: metadata.n_train,
      n_val: metadata.n_val,
      acc_threshold: metadata.acc_threshold,
      paper_phase_horizon: metadata.paper_phase_horizon,
      paper_grokking_delay: metadata.paper_grokking_delay,
      device: metadata.device,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(rawConfigJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#182030] gap-3">
        <div className="flex items-center gap-2 text-[#8b949e]">
          <span className="w-1.5 h-1.5 bg-emerald-400"></span>
          <span className="font-semibold text-[#c9d1d9] tracking-wider uppercase">
            RUN DETAILS &amp; CONFIGURATION
          </span>
          <span className="text-[#57606a]">|</span>
          <span className="text-[#57606a]">{metadata.id}</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border border-[#1e2638] bg-[#0c1017]">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-[#232d40] text-emerald-400 font-semibold'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Architecture &amp; Task</span>
          </button>
          <button
            onClick={() => setActiveTab('hyperparams')}
            className={`px-3 py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hyperparams'
                ? 'bg-[#232d40] text-emerald-400 font-semibold'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Hyperparameters</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'bg-[#232d40] text-emerald-400 font-semibold'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw config.json</span>
          </button>
          <button
            onClick={() => setActiveTab('python_api')}
            className={`px-3 py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'python_api'
                ? 'bg-[#232d40] text-amber-400 font-semibold'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Python Integration</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Architecture & Theoretical Task Formulation */}
      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 border border-[#1c2333] bg-[#0c1017]">
            <h3 className="text-xs font-semibold text-[#c9d1d9] uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-400" />
              Mathematical Model Formulation (Liu et al. 2022)
            </h3>
            <p className="text-[11px] text-[#8b949e] leading-relaxed mb-3">
              The model tests representation learning and grokking on toy non-modular addition:
            </p>
            <div className="p-2.5 bg-[#080b12] border border-[#182030] text-[11px] font-mono text-[#c9d1d9] space-y-1 mb-3">
              <div>&bull; <strong>Task:</strong> (i, j) &rarr; Dec(E_i + E_j)</div>
              <div>&bull; <strong>Embeddings:</strong> 1D scalar parameters E_k &isin; &reals;&sup1; for k &isin; {'{0, 1, ..., 9}'}</div>
              <div>&bull; <strong>Decoder:</strong> MLP with widths 1 &rarr; 200 &rarr; 200 &rarr; 30</div>
              <div>&bull; <strong>Hidden Activations:</strong> ReLU non-linearities</div>
              <div>&bull; <strong>Regression Target:</strong> Frozen random vectors Y_c &isin; &reals;&sup3;&#8304; for c = i + j</div>
            </div>
            <p className="text-[11px] text-[#6e7681] leading-relaxed">
              When grokking occurs, the 1D embeddings self-organize into an arithmetic progression (\(E_k \approx a + k \cdot b\)), allowing linear addition in representation space to generalize to held-out test pairs.
            </p>
          </div>

          <div className="p-3.5 border border-[#1c2333] bg-[#0c1017]">
            <h3 className="text-xs font-semibold text-[#c9d1d9] uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400" />
              Data Split &amp; Evaluation Protocol
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-[#182030]">
                <span className="text-[#8b949e]">Input Vocabulary Modulus (\(p\)):</span>
                <span className="text-[#e6edf3] font-semibold">{metadata.p} (elements 0 through 9)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#182030]">
                <span className="text-[#8b949e]">Total Unordered Pairs:</span>
                <span className="text-[#e6edf3] font-semibold">\(p(p+1)/2 = 55\) pairs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#182030]">
                <span className="text-[#8b949e]">Training Set Size:</span>
                <span className="text-amber-400 font-semibold">{metadata.n_train} pairs (Full Batch = {metadata.batch_size})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#182030]">
                <span className="text-[#8b949e]">Validation Set Size:</span>
                <span className="text-emerald-400 font-semibold">{metadata.n_val} pairs (Held-out 18.2%)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#182030]">
                <span className="text-[#8b949e]">Accuracy Decision Metric:</span>
                <span className="text-[#e6edf3]">Nearest neighbor: argmin_c ||Y&#770; - Y_c||&#8322;</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8b949e]">Loss Criterion:</span>
                <span className="text-[#e6edf3]">Mean Squared Error (MSE Loss)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hyperparameters */}
      {activeTab === 'hyperparams' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 border border-[#1c2333] bg-[#0c1017]">
            <span className="text-[10px] text-[#6e7681] block mb-1">EMBEDDING OPTIMIZER</span>
            <div className="text-xs font-semibold text-[#e6edf3] mb-1">Adam</div>
            <div className="text-[11px] text-[#8b949e]">
              <div>LR: <strong className="text-amber-400">{metadata.embed_lr}</strong></div>
              <div>WD: <strong className="text-[#c9d1d9]">{metadata.embed_wd}</strong></div>
            </div>
          </div>

          <div className="p-3 border border-[#1c2333] bg-[#0c1017]">
            <span className="text-[10px] text-[#6e7681] block mb-1">DECODER OPTIMIZER</span>
            <div className="text-xs font-semibold text-[#e6edf3] mb-1">AdamW</div>
            <div className="text-[11px] text-[#8b949e]">
              <div>LR: <strong className="text-amber-400">{metadata.decoder_lr}</strong></div>
              <div>WD: <strong className="text-cyan-400">{metadata.decoder_wd}</strong></div>
            </div>
          </div>

          <div className="p-3 border border-[#1c2333] bg-[#0c1017]">
            <span className="text-[10px] text-[#6e7681] block mb-1">SEEDS &amp; STABILITY</span>
            <div className="text-xs font-semibold text-[#e6edf3] mb-1">Deterministic</div>
            <div className="text-[11px] text-[#8b949e]">
              <div>Model Seed: <strong className="text-[#c9d1d9]">{metadata.seed}</strong></div>
              <div>Target Seed: <strong className="text-[#c9d1d9]">{metadata.target_seed}</strong></div>
            </div>
          </div>

          <div className="p-3 border border-[#1c2333] bg-[#0c1017]">
            <span className="text-[10px] text-[#6e7681] block mb-1">TABLE 1 PHASE CRITERIA</span>
            <div className="text-xs font-semibold text-[#e6edf3] mb-1">Thresholds</div>
            <div className="text-[11px] text-[#8b949e]">
              <div>Acc Threshold: <strong className="text-emerald-400">{metadata.acc_threshold * 100}%</strong></div>
              <div>Horizon: <strong className="text-[#c9d1d9]">{metadata.paper_phase_horizon.toLocaleString()}</strong></div>
              <div>Min Delay: <strong className="text-[#c9d1d9]">&ge; {metadata.paper_grokking_delay.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Raw JSON Config */}
      {activeTab === 'json' && (
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 border border-[#273247] hover:border-[#384663] bg-[#101520] hover:bg-[#161c2b] text-[10px] text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
          </button>
          <pre className="p-4 bg-[#080b12] border border-[#1c2333] text-[11px] text-[#c9d1d9] overflow-x-auto max-h-[280px]">
            {rawConfigJson}
          </pre>
        </div>
      )}

      {/* Tab 4: Python Integration Guide */}
      {activeTab === 'python_api' && (
        <div className="p-4 bg-[#080b12] border border-[#1c2333] space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
            <Terminal className="w-4 h-4" />
            <span>HOW TO STREAM METRICS DIRECTLY FROM PYTHON (train.py)</span>
          </div>

          <p className="text-[11px] text-[#8b949e] leading-relaxed">
            The dashboard reads standardized CSV columns (<code className="text-[#c9d1d9]">step,train_loss,val_loss,train_acc,val_acc</code>). You can feed data from your Python experiments in two ways:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 border border-[#1f2838] bg-[#0c1017]">
              <div className="text-[#e6edf3] font-semibold mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Option 1: Drop in metrics.csv
              </div>
              <p className="text-[#8b949e] mb-2 leading-relaxed">
                Click <strong>"LOAD CSV"</strong> in the top header or drag-and-drop any <code className="text-[#c9d1d9]">results/.../metrics.csv</code> into the dashboard. It will instantly parse all steps, detect threshold crossings, and render the curves.
              </p>
              <div className="text-[10px] text-[#57606a]">Zero setup required. Works offline.</div>
            </div>

            <div className="p-3 border border-[#1f2838] bg-[#0c1017]">
              <div className="text-[#e6edf3] font-semibold mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Option 2: Live Local Server
              </div>
              <p className="text-[#8b949e] mb-2 leading-relaxed">
                Run a minimal static or FastAPI server serving your experiment directory:
              </p>
              <pre className="p-2 bg-[#05070a] border border-[#182030] text-[10px] text-amber-300 overflow-x-auto">
python -m http.server 8000 --directory results/paper_regression_100k/seed0_dlr0.001_dwd0
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
