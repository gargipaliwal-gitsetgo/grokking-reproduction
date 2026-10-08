import React, { useState } from 'react';
import { X, Radio, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchMetricsFromEndpoint } from '../services/metricsLoader';
import { ExperimentRun } from '../types/experiment';

interface ApiConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRun: (run: ExperimentRun) => void;
}

export const ApiConnectModal: React.FC<ApiConnectModalProps> = ({ isOpen, onClose, onLoadRun }) => {
  const [url, setUrl] = useState('http://localhost:8000/metrics.csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const run = await fetchMetricsFromEndpoint(url);
      setSuccess(true);
      setTimeout(() => {
        onLoadRun(run);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(`Connection failed: ${err.message}. Ensure your local server is running with CORS enabled.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#0b0e16] border border-[#263147] w-full max-w-lg p-5 font-mono text-xs shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#182030]">
          <Radio className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-[#e6edf3] uppercase tracking-wider">
            CONNECT PYTHON METRICS STREAM
          </h2>
        </div>

        <p className="text-[11px] text-[#8b949e] mb-3 leading-relaxed">
          Provide the URL of a local server serving <code className="text-[#c9d1d9]">metrics.csv</code> live as your training script runs:
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[10px] text-[#6e7681] uppercase tracking-wider block mb-1">
              ENDPOINT URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8000/metrics.csv"
              className="w-full bg-[#080b12] border border-[#273247] px-3 py-2 text-xs font-mono text-[#e6edf3] focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-3 bg-[#080b12] border border-[#182030] text-[10px] text-[#8b949e] space-y-1">
            <div className="text-[#c9d1d9] font-semibold">Quick Start:</div>
            <div>Run this terminal command in your repository:</div>
            <code className="text-amber-300 block bg-[#05070a] p-1.5 border border-[#1f2838] mt-1">
              python -m http.server 8000 --directory results/paper_regression_100k/seed0_dlr0.001_dwd0
            </code>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-2.5 bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Connected and metrics loaded successfully!</span>
          </div>
        )}

        <div className="pt-3 border-t border-[#182030] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-[#273247] hover:bg-[#161c2b] text-[#8b949e] cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-1.5 border border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>CONNECT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

