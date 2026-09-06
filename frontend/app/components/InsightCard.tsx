'use client';

import { ShieldCheck, ArrowUpRight } from 'lucide-react';

interface InsightCardProps {
  insights: string[];
}

export default function InsightCard({ insights }: InsightCardProps) {
  if (!insights.length) return null;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-[#0F1722]/80 to-[#0A1017]/90 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Quantitative Findings
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              VERIFIED AGAINST DUCKDB IN-MEMORY KERNEL
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          {insights.length} KEY TAKEAWAYS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="group relative p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                METRIC {String(idx + 1).padStart(2, '0')}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
