import React from 'react';
import { LearningPhase } from '../types/experiment';
import { CheckCircle2, ChevronRight, AlertTriangle, Sparkles, Clock, HelpCircle } from 'lucide-react';

interface PhaseIndicatorProps {
  currentPhase: LearningPhase;
  stepTrainCrossing: number | null;
  stepValCrossing: number | null;
  currentStep: number;
  delaySteps: number | null;
  note?: string;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  stepTrainCrossing,
  stepValCrossing,
  currentStep,
  delaySteps,
  note,
}) => {
  const phases = [
    {
      id: 'INITIALIZATION' as LearningPhase,
      number: '01',
      title: 'INITIALIZATION',
      criterion: 'Train < 90% | Val < 90%',
      desc: 'Early optimization. Embeddings unaligned.',
      color: 'cyan',
    },
    {
      id: 'MEMORIZATION' as LearningPhase,
      number: '02',
      title: 'MEMORIZATION',
      criterion: 'Train ≥ 90% | Val < 90%',
      desc: 'Fits training set without generalized representation.',
      color: 'amber',
    },
    {
      id: 'GENERALIZATION' as LearningPhase,
      number: '03',
      title: 'GENERALIZATION',
      criterion: 'Train ≥ 90% & Val ≥ 90%',
      desc: 'Grokking delay ≥ 10³ steps. Structured linear embedding.',
      color: 'emerald',
    },
  ];

  const getPhaseStyles = (phaseId: LearningPhase) => {
    const isCurrent = currentPhase === phaseId;
    const isPast =
      (phaseId === 'INITIALIZATION' && (currentPhase === 'MEMORIZATION' || currentPhase === 'GENERALIZATION')) ||
      (phaseId === 'MEMORIZATION' && currentPhase === 'GENERALIZATION');

    if (isCurrent) {
      if (phaseId === 'GENERALIZATION') {
        return {
          card: 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50',
          badge: 'bg-emerald-500 text-black font-bold',
          title: 'text-emerald-400 font-bold',
          accent: 'text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse',
        };
      }
      if (phaseId === 'MEMORIZATION') {
        return {
          card: 'border-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50',
          badge: 'bg-amber-500 text-black font-bold',
          title: 'text-amber-400 font-bold',
          accent: 'text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
        };
      }
      return {
        card: 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50',
        badge: 'bg-cyan-500 text-black font-bold',
        title: 'text-cyan-400 font-bold',
        accent: 'text-cyan-300',
        dot: 'bg-cyan-400 animate-pulse',
      };
    }

    if (isPast) {
      return {
        card: 'border-[#263147] bg-[#0c1017]/80 opacity-70',
        badge: 'bg-[#263147] text-[#8b949e]',
        title: 'text-[#8b949e]',
        accent: 'text-[#6e7681]',
        dot: 'bg-[#8b949e]',
      };
    }

    // Future / Pending
    return {
      card: 'border-[#1b2230] bg-[#080b12]/50 opacity-40',
      badge: 'bg-[#1b2230] text-[#57606a]',
      title: 'text-[#57606a]',
      accent: 'text-[#57606a]',
      dot: 'bg-[#57606a]',
    };
  };

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[#182030] gap-2">
        <div className="flex items-center gap-2 text-[#8b949e]">
          <span className="w-1.5 h-1.5 bg-amber-400"></span>
          <span className="font-semibold text-[#c9d1d9] tracking-wider uppercase">LEARNING PHASE PIPELINE</span>
          <span className="text-[#57606a]">|</span>
          <span className="text-[#57606a]">Appendix A Table 1 Regimes</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#8b949e]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Train 90% Crossing:</span>
            <span className="text-[#e6edf3] font-semibold">
              {stepTrainCrossing !== null ? `Step ${stepTrainCrossing.toLocaleString()}` : 'None'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Val 90% Crossing:</span>
            <span className="text-[#e6edf3] font-semibold">
              {stepValCrossing !== null ? `Step ${stepValCrossing.toLocaleString()}` : 'Not reached'}
            </span>
          </div>
          {delaySteps !== null && (
            <div className="flex items-center gap-1.5">
              <span>Grokking Delay:</span>
              <span className="text-emerald-400 font-semibold">{delaySteps.toLocaleString()} steps</span>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline 3-step visualization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {phases.map((phase, idx) => {
          const styles = getPhaseStyles(phase.id);
          const isCurrent = currentPhase === phase.id;

          return (
            <div
              key={phase.id}
              className={`relative p-3.5 border transition-all duration-300 flex flex-col justify-between ${styles.card}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-xs ${styles.badge}`}>
                      {phase.number}
                    </span>
                    <span className={`text-xs tracking-wider ${styles.title}`}>
                      {phase.title}
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 border border-current rounded-xs uppercase">
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-[#8b949e] font-mono tracking-wide mb-1">
                  {phase.criterion}
                </div>
                <p className="text-[11px] text-[#6e7681] leading-relaxed">
                  {phase.desc}
                </p>
              </div>

              {/* Step info banner */}
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                {phase.id === 'INITIALIZATION' && (
                  <span className="text-[#8b949e]">
                    Step 0 &rarr; {stepTrainCrossing !== null ? stepTrainCrossing.toLocaleString() : '100,000'}
                  </span>
                )}
                {phase.id === 'MEMORIZATION' && (
                  <span className={stepTrainCrossing !== null ? 'text-amber-400' : 'text-[#6e7681]'}>
                    {stepTrainCrossing !== null
                      ? `Entered at Step ${stepTrainCrossing.toLocaleString()}`
                      : 'Not entered'}
                  </span>
                )}
                {phase.id === 'GENERALIZATION' && (
                  <span className={stepValCrossing !== null ? 'text-emerald-400' : 'text-[#6e7681]'}>
                    {stepValCrossing !== null
                      ? `Achieved at Step ${stepValCrossing.toLocaleString()}`
                      : 'Criterion pending'}
                  </span>
                )}

                {idx < 2 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#3b455b] hidden md:block" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory note banner */}
      {note && (
        <div className="mt-3 pt-2.5 border-t border-[#182030] flex items-center gap-2 text-[11px] text-[#8b949e]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[#a8b3c4]">{note}</span>
        </div>
      )}
    </div>
  );
};

