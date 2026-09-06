'use client';

import { useState } from 'react';
import { FileText, BookOpen, Download, CheckCircle, Loader2 } from 'lucide-react';
import type { QueryReport } from '../types';

interface ExportBarProps {
  sessionId: string;
  reports: QueryReport[];
}

export default function ExportBar({ sessionId, reports }: ExportBarProps) {
  const [downloading, setDownloading] = useState<'notebook' | 'pdf' | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  if (!reports.some((r) => r.status === 'completed')) return null;

  const handleExport = async (format: 'notebook' | 'pdf') => {
    setDownloading(format);
    try {
      const history = reports.flatMap((r) => [
        { role: 'user', content: r.query },
        {
          role: 'assistant',
          answer: r.executiveSummary || '',
          code: r.code || '',
          code_language: r.codeLanguage || 'sql',
          insights: r.insights || [],
        },
      ]);

      const res = await fetch(`${API_URL}/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, history }),
      });

      if (!res.ok) throw new Error(`Export failed`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        format === 'notebook'
          ? `Executive_Analysis_${sessionId.slice(0, 8)}.ipynb`
          : `Executive_Report_${sessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport('notebook')}
        disabled={downloading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150 disabled:opacity-50"
      >
        {downloading === 'notebook' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        ) : (
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>JUPYTER (.IPYNB)</span>
      </button>

      <button
        onClick={() => handleExport('pdf')}
        disabled={downloading !== null}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium text-slate-100 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20 transition-all duration-150 disabled:opacity-50"
      >
        {downloading === 'pdf' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span>EXECUTIVE PDF</span>
      </button>
    </div>
  );
}
