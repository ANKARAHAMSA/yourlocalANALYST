'use client';

import { useEffect, useRef } from 'react';
import { Bot, User, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { Message } from '../types';
import InsightCard from './InsightCard';
import ChartViewer from './ChartViewer';
import DataTable from './DataTable';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 
                          flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Ready to analyze your data</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Upload a CSV file on the left, then ask anything about your data in plain English.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg, idx) => (
        <div key={idx}>
          {msg.role === 'user' ? (
            // User message
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            // Assistant message
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1e1e3a] border border-purple-500/30 
                              flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                {/* Step indicators */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="space-y-1">
                    {msg.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-2 text-xs text-gray-500">
                        {si === msg.steps!.length - 1 && msg.isStreaming ? (
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                        <span className={si === msg.steps!.length - 1 && msg.isStreaming ? 'text-purple-400' : ''}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attempt badge */}
                {msg.attempts && msg.attempts > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <RefreshCw className="w-3 h-3" />
                    Self-corrected after {msg.attempts} attempt{msg.attempts > 1 ? 's' : ''}
                  </div>
                )}

                {/* Narrative answer */}
                {msg.content && (
                  <div className="bg-[#1e1e3a] border border-[#2a2a4a] rounded-xl rounded-tl-sm p-4">
                    <p className="text-gray-200 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                )}

                {/* Generated code */}
                {msg.code && (
                  <div className="bg-[#0d1117] border border-[#2a2a4a] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a4a]">
                      <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                        {msg.codeLanguage || 'sql'}
                      </span>
                    </div>
                    <pre className="p-4 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {msg.code}
                    </pre>
                  </div>
                )}

                {/* Chart */}
                {msg.chart && <ChartViewer chartSpec={msg.chart} />}

                {/* Data Table */}
                {msg.table && <DataTable data={msg.table} />}

                {/* Insights */}
                {msg.insights && msg.insights.length > 0 && (
                  <InsightCard insights={msg.insights} />
                )}

                {/* Error */}
                {msg.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-red-400 text-xs">{msg.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e1e3a] border border-purple-500/30 
                          flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 bg-[#1e1e3a] border border-[#2a2a4a] rounded-xl rounded-tl-sm px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
