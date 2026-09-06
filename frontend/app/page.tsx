'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Cpu,
  CornerDownLeft,
  PieChart,
  LineChart,
} from 'lucide-react';
import type { QueryReport, UploadResult } from './types';
import FileUploader from './components/FileUploader';
import ReportFeed from './components/ChatPanel';
import ExportBar from './components/ExportBar';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [reports, setReports] = useState<QueryReport[]>([]);
  const [runningReport, setRunningReport] = useState<QueryReport | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const reportsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    reportsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reports, runningReport]);

  const handleUploadSuccess = (data: UploadResult) => {
    setSessionId(data.session_id);
    setTables(data.tables);
  };

  const handleExecuteQuery = async (queryText?: string) => {
    const textToRun = (queryText || queryInput).trim();
    if (!textToRun || isExecuting || !sessionId) return;

    setQueryInput('');
    setIsExecuting(true);

    const reportId = Date.now().toString();
    const newReport: QueryReport = {
      id: reportId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      query: textToRun,
      status: 'running',
      steps: ['Initializing execution planner...'],
    };

    setRunningReport(newReport);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question: textToRun }),
      });

      if (!response.ok) throw new Error('Analysis pipeline failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream received');

      let buffer = '';
      let currentEvent: string | null = null;
      let finalResultPayload: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (currentEvent === 'step') {
                setRunningReport((prev) =>
                  prev ? { ...prev, steps: [...(prev.steps || []), data.message] } : null
                );
              } else if (currentEvent === 'result') {
                finalResultPayload = data;
              }
            } catch {
              // ignore partial line parsing
            }
          }
        }
      }

      if (finalResultPayload) {
        const completedReport: QueryReport = {
          id: reportId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          query: textToRun,
          executiveSummary: finalResultPayload.answer,
          code: finalResultPayload.code,
          codeLanguage: finalResultPayload.code_language || 'sql',
          chart: finalResultPayload.chart,
          table: finalResultPayload.table,
          insights: finalResultPayload.insights,
          attempts: finalResultPayload.attempts || 1,
          status: 'completed',
        };

        setReports((prev) => [...prev, completedReport]);
      }
    } catch (err: any) {
      const failedReport: QueryReport = {
        id: reportId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        query: textToRun,
        status: 'error',
        error: err.message || 'Analysis error occurred.',
      };
      setReports((prev) => [...prev, failedReport]);
    } finally {
      setIsExecuting(false);
      setRunningReport(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteQuery();
    }
  };

  return (
    <div className="flex h-screen analyst-mesh text-slate-100 overflow-hidden font-sans select-none">
      {/* LEFT PANEL: Data Lake & Schema Telemetry */}
      <aside className="w-84 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#090B12]/80 backdrop-blur-xl z-20">
        <FileUploader
          onUploadSuccess={handleUploadSuccess}
          onSelectQuestion={(q) => handleExecuteQuery(q)}
        />
      </aside>

      {/* CENTRAL STAGE: Executive Analytics Command Center */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        {/* Top Executive Header */}
        <header className="flex items-center justify-between px-8 py-3.5 border-b border-white/5 bg-[#090B12]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarChart3 className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-100">
                  yourlocalANALYST
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  EXECUTIVE CORE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                AUTONOMOUS QUANTITATIVE DECISION ENGINE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {tables.length > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono text-slate-300">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tables.length} TABLE{tables.length > 1 ? 'S' : ''} ATTACHED</span>
              </div>
            )}

            {sessionId && (
              <ExportBar sessionId={sessionId} reports={reports} />
            )}
          </div>
        </header>

        {/* Dynamic Canvas Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {reports.length === 0 && !runningReport ? (
            /* Atmospheric Analytical Welcome Canvas */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                  <TrendingUp className="w-10 h-10 text-emerald-400" />
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">
                  Enterprise Data Intelligence
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Ingest raw business datasets on the left to activate instant SQL compilation, quantitative executive breakdowns, and interactive financial charts.
                </p>
              </div>

              {/* High-Tech Architecture Feature Badges */}
              <div className="grid grid-cols-3 gap-3 w-full text-left">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/10 transition-all">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-slate-200">DuckDB Engine</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Blazing-fast in-memory columnar execution.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/10 transition-all">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-slate-200">AST Sandbox</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Schema-isolated syntax with auto-correction.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/10 transition-all">
                  <LineChart className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-semibold text-slate-200">Plotly Vector</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Interactive canvas with vector export.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Live Reports Feed */
            <div className="max-w-5xl mx-auto">
              <ReportFeed reports={reports} runningReport={runningReport} />
              <div ref={reportsEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM ANALYTICAL COMMAND CONSOLE */}
        <div className="p-6 bg-gradient-to-t from-[#08090E] via-[#08090E]/90 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div
              className={`relative rounded-2xl border transition-all duration-300 shadow-2xl ${
                sessionId
                  ? 'glass-panel border-white/10 focus-within:border-emerald-500/50'
                  : 'bg-white/[0.02] border-white/5 opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="font-mono text-xs font-semibold text-emerald-400 select-none pl-1">
                  QUERY &gt;
                </span>

                <textarea
                  ref={textareaRef}
                  disabled={!sessionId || isExecuting}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    sessionId
                      ? 'Enter analytical query, segment breakdown, or metric hypothesis...'
                      : 'Ingest a dataset on the left to unlock analytical console...'
                  }
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none resize-none max-h-28 leading-relaxed font-sans"
                  style={{ minHeight: '26px' }}
                />

                <button
                  disabled={!sessionId || isExecuting || !queryInput.trim()}
                  onClick={() => handleExecuteQuery()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-white/5 disabled:to-white/5 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-mono text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all duration-200"
                >
                  <span>EXECUTE</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2.5 px-2 text-[10px] font-mono text-slate-400">
              <span>DETERMINISTIC IN-MEMORY COMPUTE · SELF-CORRECTING LOGIC</span>
              <span>PRESS ENTER TO EXECUTE</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
