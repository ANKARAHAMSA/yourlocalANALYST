'use client';

import { useState } from 'react';
import { Download, FileText, FileCode, Loader2 } from 'lucide-react';
import { Message } from '../types';

interface ExportBarProps {
  sessionId: string;
  messages: Message[];
}

export default function ExportBar({ sessionId, messages }: ExportBarProps) {
  const [exportingNotebook, setExportingNotebook] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const buildHistory = () =>
    messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      code: msg.code,
      code_language: msg.codeLanguage,
      answer: msg.role === 'assistant' ? msg.content : undefined,
      insights: msg.insights,
    }));

  const handleExport = async (type: 'notebook' | 'pdf') => {
    const setter = type === 'notebook' ? setExportingNotebook : setExportingPdf;
    setter(true);

    try {
      const res = await fetch(`${API_URL}/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, history: buildHistory() }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'notebook' ? 'ai_data_analysis.ipynb' : 'ai_data_analysis_report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setter(false);
    }
  };

  if (!sessionId || messages.length < 2) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-[#2a2a4a] bg-[#12122a]">
      <Download className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-gray-500 text-xs mr-2">Export:</span>

      <button
        onClick={() => handleExport('notebook')}
        disabled={exportingNotebook}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 
                   bg-[#1e1e3a] hover:bg-blue-500/10 border border-[#2a2a4a] hover:border-blue-500/40 
                   rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
      >
        {exportingNotebook ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FileCode className="w-3 h-3" />
        )}
        Jupyter Notebook
      </button>

      <button
        onClick={() => handleExport('pdf')}
        disabled={exportingPdf}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 
                   bg-[#1e1e3a] hover:bg-red-500/10 border border-[#2a2a4a] hover:border-red-500/40 
                   rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
      >
        {exportingPdf ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
        PDF Report
      </button>
    </div>
  );
}
