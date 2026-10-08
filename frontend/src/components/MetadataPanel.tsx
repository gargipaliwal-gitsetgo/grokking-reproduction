import React from 'react';
import { ExperimentMetadata } from '../types/experiment';
import { Terminal, Hash, SlidersHorizontal, Layers, Cpu, Database } from 'lucide-react';

interface MetadataPanelProps {
  metadata: ExperimentMetadata;
  currentStep: number;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ metadata, currentStep }) => {
  const items = [
    {
      label: 'EXPERIMENT',
      value: metadata.name.split(' ')[0],
      icon: Terminal,
      highlight: true,
    },
    {
      label: 'TASK',
      value: metadata.task.toUpperCase(),
      icon: Layers,
    },
    {
      label: 'MODULUS (P)',
      value: metadata.p.toString(),
      icon: Hash,
    },
    {
      label: 'TRAIN PAIRS',
      value: `${metadata.n_train} / 55`,
      sub: 'full batch',
      icon: Database,
    },
    {
      label: 'VAL PAIRS',
      value: `${metadata.n_val} / 55`,
      sub: 'held-out',
      icon: Database,
    },
    {
      label: 'STEPS',
      value: `${currentStep.toLocaleString()} / ${metadata.steps.toLocaleString()}`,
      icon: SlidersHorizontal,
    },
    {
      label: 'SEED / TARGET',
      value: `${metadata.seed} / ${metadata.target_seed}`,
      icon: Hash,
    },
    {
      label: 'DEVICE',
      value: metadata.device.split(' ')[0],
      sub: metadata.device.includes('PyTorch') ? 'PyTorch 2.5.1' : undefined,
      icon: Cpu,
    },
  ];

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#182030]">
        <div className="flex items-center gap-2 text-[#8b949e]">
          <span className="w-1.5 h-1.5 bg-emerald-400"></span>
          <span className="font-semibold text-[#c9d1d9] tracking-wider uppercase">EXPERIMENT METADATA</span>
          <span className="text-[#57606a]">|</span>
          <span className="text-[#57606a]">Table 1 Config</span>
        </div>
        <div className="text-[11px] text-[#8b949e] flex items-center gap-3">
          <span>Dec LR: <span className="text-[#c9d1d9]">{metadata.decoder_lr}</span></span>
          <span>Dec WD: <span className="text-[#c9d1d9]">{metadata.decoder_wd}</span></span>
          <span>Acc Thresh: <span className="text-[#c9d1d9]">{metadata.acc_threshold * 100}%</span></span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-2.5 border transition-colors ${
                item.highlight
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : 'border-[#1b2230] bg-[#0f141f]/70 hover:border-[#273247]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[#6e7681] text-[10px] tracking-wider mb-1">
                <Icon className="w-3 h-3 text-[#57606a]" />
                <span>{item.label}</span>
              </div>
              <div className="text-[#e6edf3] font-semibold text-xs truncate" title={item.value}>
                {item.value}
              </div>
              {item.sub && (
                <div className="text-[10px] text-[#6e7681] mt-0.5 truncate">
                  {item.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

