'use client';

import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartSpec {
  data: object[];
  layout: object;
  config?: object;
}

interface ChartViewerProps {
  chartSpec: ChartSpec;
}

export default function ChartViewer({ chartSpec }: ChartViewerProps) {
  if (!chartSpec?.data?.length) return null;

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
      <Plot
        data={chartSpec.data as Plotly.Data[]}
        layout={{
          ...(chartSpec.layout as object),
          autosize: true,
          height: 380,
          margin: { l: 50, r: 20, t: 50, b: 50 },
        }}
        config={{
          ...(chartSpec.config as object),
          displayModeBar: true,
          responsive: true,
          modeBarButtonsToRemove: ['select2d', 'lasso2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'ai_analyst_chart',
            height: 600,
            width: 1000,
            scale: 2,
          },
        }}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
