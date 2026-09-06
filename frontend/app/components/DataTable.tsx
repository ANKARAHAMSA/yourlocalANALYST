'use client';

import { useState } from 'react';
import { Table, Copy, Check } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function DataTable({ columns, rows }: DataTableProps) {
  const [copied, setCopied] = useState(false);

  if (!columns.length || !rows.length) return null;

  const handleCopyTSV = () => {
    const header = columns.join('\t');
    const data = rows.map((r) => columns.map((col) => r[col] ?? '').join('\t')).join('\n');
    navigator.clipboard.writeText(`${header}\n${data}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/5 border border-white/10">
            <Table className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Query Result Set
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              {rows.length} RECORD{rows.length !== 1 ? 'S' : ''} RETURNED · {columns.length} DIMENSIONS
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyTSV}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-150"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">COPIED TSV</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>COPY DATA</span>
            </>
          )}
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#121522] sticky top-0 z-10">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-white/[0.03] transition-colors duration-100 font-mono text-[11px]"
              >
                {columns.map((col) => {
                  const val = row[col];
                  const isNum = typeof val === 'number';
                  return (
                    <td
                      key={col}
                      className={`px-4 py-2 whitespace-nowrap ${
                        isNum ? 'text-slate-200 text-right' : 'text-slate-300'
                      }`}
                    >
                      {val === null || val === undefined ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : isNum ? (
                        val.toLocaleString()
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
