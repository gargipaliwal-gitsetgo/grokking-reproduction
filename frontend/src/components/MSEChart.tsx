import React, { useState, useRef, useMemo } from 'react';
import { MetricPoint } from '../types/experiment';
import { Info, BarChart2 } from 'lucide-react';

interface MSEChartProps {
  metrics: MetricPoint[];
  currentStep: number;
  onScrubStep?: (step: number) => void;
}

export const MSEChart: React.FC<MSEChartProps> = ({
  metrics,
  currentStep,
  onScrubStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('log');
  const [hoveredPoint, setHoveredPoint] = useState<MetricPoint | null>(null);

  // Filter metrics up to current playback step
  const visibleData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    let filtered = metrics.filter((m) => m.step <= currentStep);
    if (filtered.length === 0 && metrics.length > 0) {
      filtered = [metrics[0]];
    }
    return filtered;
  }, [metrics, currentStep]);

  const maxX = useMemo(() => {
    const last = metrics.length > 0 ? metrics[metrics.length - 1].step : 100000;
    return Math.max(last, 100);
  }, [metrics]);

  // Dimensions
  const width = 1000;
  const height = 360;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max and Min Y for scale
  const { minY, maxY, logMinY, logMaxY } = useMemo(() => {
    let max = 2.0;
    let min = 0.0;
    let lMax = 1.0; // log10(10) or log10(2) ~ 0.3
    let lMin = -6.0; // 10^-6

    for (const pt of visibleData) {
      if (pt.val_mse > max) max = pt.val_mse;
      if (pt.train_mse > max) max = pt.train_mse;
    }

    return {
      minY: min,
      maxY: Math.ceil(max * 1.1 * 10) / 10,
      logMinY: lMin,
      logMaxY: lMax,
    };
  }, [visibleData]);

  // Coordinate transforms
  const getX = (step: number) => padding.left + (step / maxX) * chartWidth;

  const getY = (val: number) => {
    if (scaleMode === 'linear') {
      const clamped = Math.max(minY, Math.min(maxY, val));
      return padding.top + chartHeight - ((clamped - minY) / (maxY - minY)) * chartHeight;
    } else {
      // Log10 scale
      const safeVal = Math.max(1e-6, val);
      const logVal = Math.log10(safeVal);
      const clamped = Math.max(logMinY, Math.min(logMaxY, logVal));
      const ratio = (clamped - logMinY) / (logMaxY - logMinY);
      return padding.top + chartHeight - ratio * chartHeight;
    }
  };

  // Generate SVG path for lines
  const { trainPath, valPath } = useMemo(() => {
    if (visibleData.length === 0) return { trainPath: '', valPath: '' };

    let tPath = `M ${getX(visibleData[0].step)} ${getY(visibleData[0].train_mse)}`;
    let vPath = `M ${getX(visibleData[0].step)} ${getY(visibleData[0].val_mse)}`;

    for (let i = 1; i < visibleData.length; i++) {
      const pt = visibleData[i];
      tPath += ` L ${getX(pt.step)} ${getY(pt.train_mse)}`;
      vPath += ` L ${getX(pt.step)} ${getY(pt.val_mse)}`;
    }

    return { trainPath: tPath, valPath: vPath };
  }, [visibleData, scaleMode, maxX, maxY, minY, logMinY, logMaxY]);

  // Mouse hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || visibleData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padding.left / width) * rect.width) / ((chartWidth / width) * rect.width)));
    const targetStep = ratio * maxX;

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

  // Y Ticks
  const yTicks = useMemo(() => {
    if (scaleMode === 'linear') {
      return [0, 0.4, 0.8, 1.2, 1.6, 2.0].filter((v) => v <= maxY);
    } else {
      // Log10 ticks: 10^0, 10^-1, 10^-2, 10^-3, 10^-4, 10^-5, 10^-6
      return [1, 0.1, 0.01, 1e-3, 1e-4, 1e-5, 1e-6];
    }
  }, [scaleMode, maxY]);

  // X Ticks
  const xTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round((i / count) * maxX));
    }
    return ticks;
  }, [maxX]);

  const activePoint = hoveredPoint || (visibleData.length > 0 ? visibleData[visibleData.length - 1] : null);

  const formatMse = (val: number) => {
    if (val === 0) return '0.000';
    if (val < 0.001) return val.toExponential(4);
    return val.toFixed(4);
  };

  return (
    <div className="bg-[#0b0e16] border border-[#1c2333] p-4 text-xs font-mono flex flex-col">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[#182030] gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#8b949e]">
            <span className="w-1.5 h-1.5 bg-emerald-400"></span>
            <span className="font-semibold text-[#c9d1d9] tracking-wider uppercase">
              MSE LOSS VS TRAINING STEPS
            </span>
          </div>

          <span className="text-[10px] px-2 py-0.5 border border-[#232d40] bg-[#101522] text-[#8b949e]">
            Regression Target \(Y_c\)
          </span>
        </div>

        {/* Legend & Scale Controls */}
        <div className="flex items-center flex-wrap gap-4 text-[11px]">
          {/* Legend: Train MSE */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-400"></span>
            <span className="text-amber-400 font-semibold">train_mse</span>
            <span className="text-[#6e7681] text-[10px]">(&rarr; 0.000)</span>
          </div>

          {/* Legend: Val MSE */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400"></span>
            <span className="text-cyan-400 font-semibold">val_mse</span>
            <span className="text-[#6e7681] text-[10px]">(&sim; 1.5 - 1.6)</span>
          </div>

          {/* Scale Toggle: Linear vs Log10 */}
          <div className="flex items-center border border-[#1e2638] bg-[#0c1017]">
            <button
              onClick={() => setScaleMode('log')}
              className={`px-2.5 py-0.5 text-[10px] transition-colors ${
                scaleMode === 'log'
                  ? 'bg-[#232d40] text-emerald-400 font-semibold'
                  : 'text-[#6e7681] hover:text-[#c9d1d9]'
              }`}
            >
              Log₁₀ Scale
            </button>
            <button
              onClick={() => setScaleMode('linear')}
              className={`px-2.5 py-0.5 text-[10px] transition-colors ${
                scaleMode === 'linear'
                  ? 'bg-[#232d40] text-[#e6edf3] font-semibold'
                  : 'text-[#6e7681] hover:text-[#c9d1d9]'
              }`}
            >
              Linear Scale
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div ref={containerRef} className="relative w-full h-[320px] sm:h-[360px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleChartClick}
        >
          {/* Horizontal Grid Lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            const label =
              scaleMode === 'log'
                ? tick >= 1
                  ? '1.0'
                  : `10⁻${Math.abs(Math.round(Math.log10(tick)))}`
                : tick.toFixed(1);

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
                  {label}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Lines */}
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

          {/* Validation MSE Line (Cyan) */}
          {valPath && (
            <path
              d={valPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Training MSE Line (Amber) */}
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

          {/* Active Hover Point Marker */}
          {activePoint && (
            <g>
              <line
                x1={getX(activePoint.step)}
                y1={padding.top}
                x2={getX(activePoint.step)}
                y2={height - padding.bottom}
                stroke="#4a5568"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(activePoint.step)}
                cy={getY(activePoint.train_mse)}
                r="4.5"
                fill="#f59e0b"
                stroke="#0b0e16"
                strokeWidth="2"
              />
              <circle
                cx={getX(activePoint.step)}
                cy={getY(activePoint.val_mse)}
                r="4.5"
                fill="#06b6d4"
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
            x={16}
            y={padding.top + chartHeight / 2}
            fill="#8b949e"
            fontSize="11"
            textAnchor="middle"
            fontFamily="monospace"
            transform={`rotate(-90 16 ${padding.top + chartHeight / 2})`}
            letterSpacing="0.05em"
          >
            {scaleMode === 'log' ? 'LOG₁₀ MSE LOSS' : 'MSE LOSS'}
          </text>
        </svg>

        {/* Floating Tooltip / HUD HUD HUD */}
        {activePoint && (
          <div
            className="absolute top-2 right-4 bg-[#0a0e17]/95 border border-[#2a3449] p-3 text-xs shadow-xl pointer-events-none backdrop-blur font-mono min-w-[210px]"
            style={{ zIndex: 10 }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#1f2838] text-[#8b949e]">
              <span className="font-semibold text-[#c9d1d9]">MSE LOSS HUD</span>
              <span className="text-cyan-400">Step {activePoint.step.toLocaleString()}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8b949e] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-400" />
                  train_mse:
                </span>
                <span className="text-amber-400 font-bold">
                  {formatMse(activePoint.train_mse)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8b949e] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-cyan-400" />
                  val_mse:
                </span>
                <span className="text-cyan-400 font-bold">
                  {formatMse(activePoint.val_mse)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#182030] text-[10px]">
                <span className="text-[#6e7681]">Loss Gap (&Delta;):</span>
                <span className="text-rose-400 font-semibold">
                  +{(activePoint.val_mse - activePoint.train_mse).toFixed(4)}
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
            Log scale highlights how training loss plunges by 5 orders of magnitude (to ~10⁻⁶) while validation error stays flat at ~1.5.
          </span>
        </div>
        <span className="text-[#57606a]">Click chart to seek step</span>
      </div>
    </div>
  );
};

