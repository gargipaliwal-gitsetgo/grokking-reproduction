import React from 'react';
import { MetricPoint } from '../types/experiment';
import { Target, TrendingDown, ArrowDownRight, ArrowUpRight, Gauge } from 'lucide-react';

interface MetricsCardsProps {
  currentMetrics: MetricPoint;
  lastMetrics?: MetricPoint;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ currentMetrics }) => {
  const formatMse = (val: number): string => {
    if (val === 0) return '0.000000';
    if (val < 0.001) {
      return val.toExponential(4);
    }
    return val.toFixed(4);
  };

  const trainAccPct = (currentMetrics.train_acc * 100).toFixed(1);
  const valAccPct = (currentMetrics.val_acc * 100).toFixed(1);
  const accGapPct = ((currentMetrics.val_acc - currentMetrics.train_acc) * 100).toFixed(1);
  const mseGap = (currentMetrics.val_mse - currentMetrics.train_mse).toFixed(4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
      {/* 1. Training Accuracy */}
      <div className="p-3.5 bg-[#0b0e16] border border-amber-500/30 hover:border-amber-500/60 transition-colors">
        <div className="flex items-center justify-between text-[#8b949e] text-[10px] uppercase tracking-wider mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400" />
            <span className="font-semibold text-[#c9d1d9]">TRAIN ACCURACY</span>
          </div>
          <span className="px-1.5 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[9px] font-bold">
            {currentMetrics.train_acc >= 0.9 ? 'MEMORIZED' : 'LEARNING'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-amber-400">
            {trainAccPct}%
          </div>
          <span className="text-xs text-[#8b949e]">
            ({currentMetrics.train_acc.toFixed(3)})
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#182030] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span>Threshold &ge; 90.0%</span>
          <span className="text-amber-300 font-semibold">
            {currentMetrics.train_acc >= 0.9 ? '✓ PASSED' : 'PENDING'}
          </span>
        </div>
      </div>

      {/* 2. Validation Accuracy */}
      <div className="p-3.5 bg-[#0b0e16] border border-emerald-500/30 hover:border-emerald-500/60 transition-colors">
        <div className="flex items-center justify-between text-[#8b949e] text-[10px] uppercase tracking-wider mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400" />
            <span className="font-semibold text-[#c9d1d9]">VAL ACCURACY</span>
          </div>
          <span
            className={`px-1.5 py-0.5 border text-[9px] font-bold ${
              currentMetrics.val_acc >= 0.9
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
          >
            {currentMetrics.val_acc >= 0.9 ? 'GENERALIZED' : 'STALLED (~20%)'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <div
            className={`text-2xl font-bold ${
              currentMetrics.val_acc >= 0.9 ? 'text-emerald-400' : 'text-[#c9d1d9]'
            }`}
          >
            {valAccPct}%
          </div>
          <span className="text-xs text-[#8b949e]">
            ({currentMetrics.val_acc.toFixed(3)})
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#182030] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span>Generalization Gap</span>
          <span className={`font-semibold ${parseFloat(accGapPct) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {accGapPct}%
          </span>
        </div>
      </div>

      {/* 3. Training MSE */}
      <div className="p-3.5 bg-[#0b0e16] border border-[#1c2333] hover:border-[#2a3449] transition-colors">
        <div className="flex items-center justify-between text-[#8b949e] text-[10px] uppercase tracking-wider mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-[#c9d1d9]">TRAIN MSE (LOSS)</span>
          </div>
          <span className="px-1.5 py-0.5 border border-[#2a3449] bg-[#121722] text-[#8b949e] text-[9px]">
            &rarr; 0.000
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-[#e6edf3]">
            {formatMse(currentMetrics.train_mse)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#182030] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span>Target bank Y_c &isin; &reals;&sup3;&#8304;</span>
          <span className="text-amber-400">Overfitting</span>
        </div>
      </div>

      {/* 4. Validation MSE */}
      <div className="p-3.5 bg-[#0b0e16] border border-[#1c2333] hover:border-[#2a3449] transition-colors">
        <div className="flex items-center justify-between text-[#8b949e] text-[10px] uppercase tracking-wider mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-[#c9d1d9]">VAL MSE (LOSS)</span>
          </div>
          <span className="px-1.5 py-0.5 border border-[#2a3449] bg-[#121722] text-[#8b949e] text-[9px]">
            HELD-OUT
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-[#e6edf3]">
            {formatMse(currentMetrics.val_mse)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#182030] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span>Loss Divergence (&Delta; MSE)</span>
          <span className="text-rose-400 font-semibold">
            +{mseGap}
          </span>
        </div>
      </div>
    </div>
  );
};
