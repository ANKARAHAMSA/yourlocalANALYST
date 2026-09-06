'use client';

import dynamic from 'next/dynamic';
import { BarChart3, TrendingUp, PieChart, Maximize2 } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartSpec {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface ChartViewerProps {
  chartSpec: ChartSpec;
}

export default function ChartViewer({ chartSpec }: ChartViewerProps) {
  if (!chartSpec?.data?.length) return null;

  const rawType = (chartSpec.data[0]?.type as string) || 'bar';
  const getIcon = () => {
    if (rawType === 'pie') return <PieChart className="w-3.5 h-3.5 text-amber-400" />;
    if (rawType === 'scatter') return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
    return <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />;
  };

  // Executive palette override for luxury visual presentation
  const enhancedData = chartSpec.data.map((trace, idx) => {
    const palette = ['#00D2B4', '#0EA5E9', '#D4AF37', '#818CF8', '#F43F5E', '#10B981'];
    const color = palette[idx % palette.length];
    return {
      ...trace,
      marker: {
        color: (trace.marker as Record<string, unknown>)?.color || color,
        line: { color: 'rgba(255, 255, 255, 0.15)', width: 1 },
      },
    };
  });

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Interactive Visualization
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              VECTOR ENGINE · {rawType.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            LIVE RENDER
          </span>
        </div>
      </div>

      {/* Plotly Canvas */}
      <div className="p-3 bg-[#0B0D14]/80">
        <Plot
          data={enhancedData as Plotly.Data[]}
          layout={{
            ...(chartSpec.layout as object),
            autosize: true,
            height: 380,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#94a3b8',
              size: 11,
            },
            xaxis: {
              ...(chartSpec.layout?.xaxis as object),
              gridcolor: 'rgba(255, 255, 255, 0.05)',
              zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            },
            yaxis: {
              ...(chartSpec.layout?.yaxis as object),
              gridcolor: 'rgba(255, 255, 255, 0.05)',
              zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            },
            margin: { l: 50, r: 25, t: 40, b: 50 },
          }}
          config={{
            ...(chartSpec.config as object),
            displayModeBar: true,
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d'],
            toImageButtonOptions: {
              format: 'png',
              filename: 'analyst_report_chart',
              height: 700,
              width: 1200,
              scale: 2,
            },
          }}
          style={{ width: '100%' }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
