import React, { useState, useRef, useMemo } from 'react';
import { MetricPoint } from '../types/experiment';
import { Eye, EyeOff, ZoomIn, Info } from 'lucide-react';

interface AccuracyChartProps {
  metrics: MetricPoint[];
  currentStep: number;
  accThreshold?: number;
  onScrubStep?: (step: number) => void;
}

export const AccuracyChart: React.FC<AccuracyChartProps> = ({
  metrics,
  currentStep,
  accThreshold = 0.9,
  onScrubStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomRange, setZoomRange] = useState<'all' | '5k' | '20k'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<MetricPoint | null>(null);
  const [showThreshold, setShowThreshold] = useState(true);
  const [showGapFill, setShowGapFill] = useState(true);

  // Filter metrics up to currentStep or full depending on playback
  const visibleData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    // Slice up to current playback step
    let filtered = metrics.filter((m) => m.step <= currentStep);
    if (filtered.length === 0 && metrics.length > 0) {
      filtered = [metrics[0]];
    }

    if (zoomRange === '5k') {
      filtered = filtered.filter((m) => m.step <= 5000);
    } else if (zoomRange === '20k') {
      filtered = filtered.filter((m) => m.step <= 20000);
    }

    return filtered;
  }, [metrics, currentStep, zoomRange]);

  // Max X for scale
  const maxX = useMemo(() => {
    if (zoomRange === '5k') return 5000;
    if (zoomRange === '20k') return 20000;
    const lastMetricStep = metrics.length > 0 ? metrics[metrics.length - 1].step : 100000;
    return Math.max(lastMetricStep, 100);
  }, [zoomRange, metrics]);

  // Dimensions for SVG viewBox
  const width = 1000;
  const height = 400;
  const padding = { top: 30, right: 35, bottom: 45, left: 55 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const getX = (step: number) => padding.left + (step / maxX) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - Math.max(0, Math.min(1, val)) * chartHeight;

  // Generate SVG path for lines
  const { trainPath, valPath, gapAreaPath } = useMemo(() => {
    if (visibleData.length === 0) return { trainPath: '', valPath: '', gapAreaPath: '' };

    let tPath = `M ${getX(visibleData[0].step)} ${getY(visibleData[0].train_acc)}`;
    let vPath = `M ${getX(visibleData[0].step)} ${getY(visibleData[0].val_acc)}`;

    for (let i = 1; i < visibleData.length; i++) {
      const pt = visibleData[i];
      tPath += ` L ${getX(pt.step)} ${getY(pt.train_acc)}`;
      vPath += ` L ${getX(pt.step)} ${getY(pt.val_acc)}`;
    }

    // Gap area between train and val
    let gapPath = '';
    if (visibleData.length > 1) {
      gapPath = `M ${getX(visibleData[0].step)} ${getY(visibleData[0].train_acc)}`;
      for (let i = 1; i < visibleData.length; i++) {
        gapPath += ` L ${getX(visibleData[i].step)} ${getY(visibleData[i].train_acc)}`;
      }
      for (let i = visibleData.length - 1; i >= 0; i--) {
        gapPath += ` L ${getX(visibleData[i].step)} ${getY(visibleData[i].val_acc)}`;
      }
      gapPath += ' Z';
    }

    return { trainPath: tPath, valPath: vPath, gapAreaPath: gapPath };
  }, [visibleData, maxX]);

  // Mouse hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || visibleData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padding.left / width) * rect.width) / ((chartWidth / width) * rect.width)));
    const targetStep = ratio * maxX;

    // Find nearest point
    let closest = visibleData[0];
    let minDiff = Math.abs(closest.step - targetStep);

    for (let i = 1; i < visibleData.length; i++) {
      const diff = Math.abs(visibleData[i].step - targetStep);
      if (diff < minDiff) {
        minDiff = diff;
        closest = visibleData[i];
      }
    }

    setHoveredPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const handleChartClick = () => {
    if (hoveredPoint && onScrubStep) {
      onScrubStep(hoveredPoint.step);
    }
  };

  // Y-axis ticks
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // X-axis ticks
  const xTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round((i / count) * maxX));
    }
    return ticks;
  }, [maxX]);

  const activePoint = hoveredPoint || (visibleData.length > 0 ? visibleData[visibleData.length - 1] : null);

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono flex flex-col">
      {/* Header bar with toggles and legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[#182030] gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#8b949e]">
            <span className="w-1.5 h-1.5 bg-amber-400"></span>
            <span className="font-semibold text-[#c9d1d9] tracking-wider uppercase">
              ACCURACY VS TRAINING STEPS
            </span>
          </div>

          <span className="text-[10px] px-2 py-0.5 border border-[#232d40] bg-[#101522] text-[#8b949e]">
            Nearest Vector Metric
          </span>
        </div>

        {/* Legend & Controls */}
        <div className="flex items-center flex-wrap gap-4 text-[11px]">
          {/* Legend: Train */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-400"></span>
            <span className="text-amber-400 font-semibold">train_acc</span>
            <span className="text-[#6e7681] text-[10px]">(Memorization)</span>
          </div>

          {/* Legend: Val */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-400"></span>
            <span className="text-emerald-400 font-semibold">val_acc</span>
            <span className="text-[#6e7681] text-[10px]">(Generalization)</span>
          </div>

          {/* Threshold toggle */}
          <button
            onClick={() => setShowThreshold(!showThreshold)}
            className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] transition-colors cursor-pointer ${
              showThreshold
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                : 'border-[#263147] text-[#6e7681] bg-[#101520]'
            }`}
          >
            {showThreshold ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>90% Thresh</span>
          </button>

          {/* Gap area toggle */}
          <button
            onClick={() => setShowGapFill(!showGapFill)}
            className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] transition-colors cursor-pointer ${
              showGapFill
                ? 'border-amber-500/40 text-amber-400 bg-amber-950/20'
                : 'border-[#263147] text-[#6e7681] bg-[#101520]'
            }`}
          >
            <span>Gap Shading</span>
          </button>

          {/* Zoom ranges */}
          <div className="flex items-center border border-[#1e2638] bg-[#0c1017]">
            <button
              onClick={() => setZoomRange('all')}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                zoomRange === 'all' ? 'bg-[#232d40] text-[#e6edf3] font-semibold' : 'text-[#6e7681] hover:text-[#c9d1d9]'
              }`}
            >
              100k
            </button>
            <button
              onClick={() => setZoomRange('20k')}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                zoomRange === '20k' ? 'bg-[#232d40] text-[#e6edf3] font-semibold' : 'text-[#6e7681] hover:text-[#c9d1d9]'
              }`}
            >
              20k
            </button>
            <button
              onClick={() => setZoomRange('5k')}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                zoomRange === '5k' ? 'bg-[#232d40] text-[#e6edf3] font-semibold' : 'text-[#6e7681] hover:text-[#c9d1d9]'
              }`}
            >
              5k Zoom
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div ref={containerRef} className="relative w-full h-[360px] sm:h-[400px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleChartClick}
        >
          {/* Subtle Grid Lines (Horizontal) */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#171d29"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#6e7681"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {(tick * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Subtle Grid Lines (Vertical) */}
          {xTicks.map((tick) => {
            const x = getX(tick);
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#171d29"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  fill="#6e7681"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {tick >= 1000 ? `${tick / 1000}k` : tick}
                </text>
              </g>
            );
          })}

          {/* Threshold 90% Line */}
          {showThreshold && (
            <g>
              <line
                x1={padding.left}
                y1={getY(accThreshold)}
                x2={width - padding.right}
                y2={getY(accThreshold)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.8"
              />
              <rect
                x={width - padding.right - 145}
                y={getY(accThreshold) - 18}
                width="145"
                height="16"
                fill="#071811"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeOpacity="0.6"
              />
              <text
                x={width - padding.right - 140}
                y={getY(accThreshold) - 6}
                fill="#34d399"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="600"
              >
                90% PAPER THRESHOLD
              </text>
            </g>
          )}

          {/* Memorization Gap Area (amber to dark gradient) */}
          {showGapFill && gapAreaPath && (
            <path
              d={gapAreaPath}
              fill="rgba(245, 158, 11, 0.08)"
              stroke="none"
            />
          )}

          {/* Validation Accuracy Line (Emerald) */}
          {valPath && (
            <path
              d={valPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Training Accuracy Line (Amber/Orange) */}
          {trainPath && (
            <path
              d={trainPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active hover crosshair and point marker */}
          {activePoint && (
            <g>
              {/* Vertical Crosshair */}
              <line
                x1={getX(activePoint.step)}
                y1={padding.top}
                x2={getX(activePoint.step)}
                y2={height - padding.bottom}
                stroke="#4a5568"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Train Acc Point */}
              <circle
                cx={getX(activePoint.step)}
                cy={getY(activePoint.train_acc)}
                r="4.5"
                fill="#f59e0b"
                stroke="#0b0e16"
                strokeWidth="2"
              />

              {/* Val Acc Point */}
              <circle
                cx={getX(activePoint.step)}
                cy={getY(activePoint.val_acc)}
                r="4.5"
                fill="#10b981"
                stroke="#0b0e16"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Label */}
          <text
            x={padding.left + chartWidth / 2}
            y={height - 8}
            fill="#8b949e"
            fontSize="11"
            textAnchor="middle"
            fontFamily="monospace"
            letterSpacing="0.05em"
          >
            TRAINING STEPS &rarr;
          </text>

          {/* Y Axis Label */}
          <text
            x={15}
            y={padding.top + chartHeight / 2}
            fill="#8b949e"
            fontSize="11"
            textAnchor="middle"
            fontFamily="monospace"
            transform={`rotate(-90 15 ${padding.top + chartHeight / 2})`}
            letterSpacing="0.05em"
          >
            ACCURACY
          </text>
        </svg>

        {/* Floating Tooltip / HUD HUD HUD */}
        {activePoint && (
          <div
            className="absolute top-2 right-4 bg-[#0a0e17]/95 border border-[#2a3449] p-3 text-xs shadow-xl pointer-events-none backdrop-blur font-mono min-w-[210px]"
            style={{ zIndex: 10 }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#1f2838] text-[#8b949e]">
              <span className="font-semibold text-[#c9d1d9]">CURSOR HUD</span>
              <span className="text-amber-400">Step {activePoint.step.toLocaleString()}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8b949e] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-400" />
                  train_acc:
                </span>
                <span className="text-amber-400 font-bold">
                  {(activePoint.train_acc * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8b949e] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400" />
                  val_acc:
                </span>
                <span className="text-emerald-400 font-bold">
                  {(activePoint.val_acc * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#182030] text-[10px]">
                <span className="text-[#6e7681]">Generalization Gap:</span>
                <span className="text-rose-400 font-semibold">
                  {((activePoint.val_acc - activePoint.train_acc) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#6e7681]">State:</span>
                <span
                  className={
                    activePoint.val_acc >= 0.9
                      ? 'text-emerald-400 font-bold'
                      : activePoint.train_acc >= 0.9
                      ? 'text-amber-400 font-bold'
                      : 'text-cyan-400'
                  }
                >
                  {activePoint.val_acc >= 0.9
                    ? 'GENERALIZED'
                    : activePoint.train_acc >= 0.9
                    ? 'MEMORIZED'
                    : 'INITIALIZING'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Annotation Footnote */}
      <div className="mt-3 pt-2 border-t border-[#182030] flex flex-wrap items-center justify-between text-[11px] text-[#6e7681] gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#57606a]" />
          <span>
            <strong className="text-amber-400">Amber curve</strong> reaches 100% (train memorized) while{' '}
            <strong className="text-emerald-400">Green curve</strong> stalls at ~20% (val held-out baseline).
          </span>
        </div>
        <span className="text-[#57606a]">Click anywhere on chart to seek step</span>
      </div>
    </div>
  );
};

