'use client';

import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
  insights: string[];
}

export default function InsightCard({ insights }: InsightCardProps) {
  if (!insights.length) return null;

  return (
    <div className="bg-[#0f2a1a] border border-green-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-green-400" />
        <h3 className="text-green-400 font-semibold text-sm">Key Insights</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5 text-xs font-bold flex-shrink-0">
              {i + 1}.
            </span>
            <p className="text-gray-300 text-sm leading-relaxed">{insight}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
