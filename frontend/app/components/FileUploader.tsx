'use client';

import { useState, useCallback } from 'react';
import { Database, UploadCloud, FileSpreadsheet, Sparkles, ChevronRight, CheckCircle2, Columns } from 'lucide-react';
import type { UploadResult } from '../types';

interface FileUploaderProps {
  onUploadSuccess: (data: UploadResult) => void;
  onSelectQuestion: (question: string) => void;
}

export default function FileUploader({ onUploadSuccess, onSelectQuestion }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to ingest dataset');
      }
      const data: UploadResult = await res.json();
      setUploadedData(data);
      onUploadSuccess(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [API_URL, onUploadSuccess]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-slate-200">
      {/* Telemetry Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-100 font-mono">
                DATA ENGINE KERNEL
              </h2>
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                DUCKDB IN-MEMORY · ISOLATED
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Drag & Drop Ingestion Port */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('dataset-input')?.click()}
          className={`relative group rounded-2xl p-6 text-center border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
              : 'border-white/10 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:border-emerald-500/40 group-hover:scale-110 transition-all duration-300">
              <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs font-semibold text-slate-200 tracking-wide">
              {isUploading ? 'Ingesting & Profiling Schema...' : 'Ingest Tabular Data (CSV)'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Drag & drop files or browse directory
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                MULTI-TABLE JOIN READY
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ZERO DISK RETENTION
              </span>
            </div>
          </div>

          <input
            id="dataset-input"
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Profiled Data Dictionary */}
        {uploadedData && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Active Relational Tables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Registered Data Schemas
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {uploadedData.tables.length} TABLE{uploadedData.tables.length > 1 ? 'S' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {uploadedData.tables.map((table) => {
                  const cols = uploadedData.schemas[table] || [];
                  return (
                    <div
                      key={table}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-mono text-xs font-bold text-slate-200">{table}</span>
                        <span className="text-[10px] font-mono text-slate-400 ml-auto">
                          {cols.length} cols
                        </span>
                      </div>

                      {/* Column Pill List */}
                      <div className="flex flex-wrap gap-1">
                        {cols.slice(0, 8).map((c) => (
                          <span
                            key={c.column}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5"
                            title={`${c.column} (${c.type})`}
                          >
                            {c.column}
                          </span>
                        ))}
                        {cols.length > 8 && (
                          <span className="text-[10px] font-mono text-slate-400 px-1 py-0.5">
                            +{cols.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Automated Executive Baseline */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Columns className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">
                  Automated Dataset Profile
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
                {uploadedData.eda_summary}
              </p>
            </div>

            {/* High-Value Analytical Queries (Preset Directives) */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Recommended Analytical Angles
                </span>
              </div>
              <div className="space-y-1.5">
                {uploadedData.suggested_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectQuestion(q)}
                    className="w-full text-left group p-2.5 rounded-xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all duration-200 flex items-start gap-2"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-300 group-hover:text-slate-100 font-sans leading-snug">
                      {q}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
