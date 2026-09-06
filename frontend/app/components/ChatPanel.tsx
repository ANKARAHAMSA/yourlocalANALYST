'use client';

import { useState } from 'react';
import { Terminal, BarChart2, Table, Code2, CheckCircle, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import type { QueryReport } from '../types';
import ChartViewer from './ChartViewer';
import DataTable from './DataTable';
import InsightCard from './InsightCard';

interface ReportFeedProps {
  reports: QueryReport[];
  runningReport?: QueryReport | null;
}

export default function ReportFeed({ reports, runningReport }: ReportFeedProps) {
  const [activeTabs, setActiveTabs] = useState<Record<string, 'overview' | 'sql' | 'data'>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const getTab = (id: string) => activeTabs[id] || 'overview';
  const setTab = (id: string, tab: 'overview' | 'sql' | 'data') => {
    setActiveTabs((prev) => ({ ...prev, [id]: tab }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      {reports.map((report) => {
        const currentTab = getTab(report.id);

        return (
          <div
            key={report.id}
            className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300"
          >
            {/* Report Header Banner */}
            <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-slate-200">
                  SQL
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight">
                    {report.query}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">
                      {report.timestamp}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      VERIFIED QUERY
                    </span>
                    {report.attempts && report.attempts > 1 && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        RESOLVED ON RETRY
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 font-mono text-xs">
                <button
                  onClick={() => setTab(report.id, 'overview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    currentTab === 'overview'
                      ? 'bg-white/10 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CHARTS & FINDINGS</span>
                </button>

                {report.code && (
                  <button
                    onClick={() => setTab(report.id, 'sql')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                      currentTab === 'sql'
                        ? 'bg-white/10 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SQL AUDIT</span>
                  </button>
                )}

                {report.table && (
                  <button
                    onClick={() => setTab(report.id, 'data')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                      currentTab === 'data'
                        ? 'bg-white/10 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5 text-amber-400" />
                    <span>DATASET</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {currentTab === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Briefing Text */}
                  {report.executiveSummary && (
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 leading-relaxed">
                      <div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                        <span>EXECUTIVE SUMMARY</span>
                      </div>
                      <p className="text-sm text-slate-200 font-sans leading-relaxed">
                        {report.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Quantitative Findings Cards */}
                  {report.insights && report.insights.length > 0 && (
                    <InsightCard insights={report.insights} />
                  )}

                  {/* Visual Chart */}
                  {report.chart && (
                    <ChartViewer chartSpec={report.chart as any} />
                  )}

                  {/* Quick Data Sample If No Chart */}
                  {!report.chart && report.table && (
                    <DataTable columns={report.table.columns} rows={report.table.rows} />
                  )}
                </div>
              )}

              {currentTab === 'sql' && report.code && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0C14]">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>DUCKDB SQL DIALECT · IN-MEMORY</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(report.code!, report.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      {copiedCode === report.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>COPY SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed selection:bg-emerald-950">
                    <code>{report.code}</code>
                  </pre>
                </div>
              )}

              {currentTab === 'data' && report.table && (
                <DataTable columns={report.table.columns} rows={report.table.rows} />
              )}

              {report.error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{report.error}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Live Pipeline Execution Card */}
      {runningReport && (
        <div className="glass-panel rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/60 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-sans">
                {runningReport.query}
              </h3>
              <p className="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                EXECUTING QUERY IN DUCKDB...
              </p>
            </div>
          </div>

          {/* Live Step Progress Feed */}
          {runningReport.steps && runningReport.steps.length > 0 && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs space-y-2">
              {runningReport.steps.map((step, sIdx) => (
                <div key={sIdx} className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
