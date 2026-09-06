'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, BarChart3, Sparkles } from 'lucide-react';
import FileUploader from './components/FileUploader';
import ChatPanel from './components/ChatPanel';
import ExportBar from './components/ExportBar';
import { Message, UploadResult } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleUploadSuccess = useCallback((result: UploadResult) => {
    setSessionId(result.session_id);
    setMessages([]);
  }, []);

  const handleQuestionSelect = useCallback((q: string) => {
    setInput(q);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userQuestion = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }]);

    // Add placeholder assistant message for streaming
    const assistantIdx = messages.length + 1;
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        steps: [],
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question: userQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: step')) continue;
          if (line.startsWith('event: result')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.message) {
              // Step event
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    steps: [...(last.steps || []), data.message],
                    isStreaming: true,
                  };
                }
                return updated;
              });
            } else if (data.answer !== undefined || data.code !== undefined) {
              // Result event
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: data.answer || '',
                    code: data.code,
                    codeLanguage: data.code_language,
                    chart: data.chart,
                    table: data.table,
                    insights: data.insights || [],
                    attempts: data.attempts,
                    error: data.error,
                    isStreaming: false,
                  };
                }
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err: unknown) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: '',
            error: err instanceof Error ? err.message : 'An unexpected error occurred.',
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d1a] text-white overflow-hidden">
      {/* ── Left Sidebar ── */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-[#2a2a4a] bg-[#12122a]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#2a2a4a]">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">AI Data Analyst</h1>
            <p className="text-gray-500 text-xs">Self-Correcting · Powered by Gemini</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <FileUploader
            onUploadSuccess={handleUploadSuccess}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#2a2a4a] bg-[#0d0d1a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">
              {sessionId
                ? 'Ask anything about your data in plain English'
                : 'Upload a CSV file to get started'}
            </span>
          </div>
          {sessionId && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Session active</span>
            </div>
          )}
        </header>

        {/* Chat Messages */}
        <ChatPanel messages={messages} isLoading={isLoading} />

        {/* Export Bar */}
        {sessionId && (
          <ExportBar sessionId={sessionId} messages={messages} />
        )}

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-[#2a2a4a] bg-[#0d0d1a]">
          <div className={`flex items-end gap-3 bg-[#1e1e3a] border rounded-2xl px-4 py-3 transition-all duration-200
            ${!sessionId ? 'opacity-50 pointer-events-none border-[#2a2a4a]' : 'border-[#2a2a4a] focus-within:border-purple-500/50'}`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!sessionId || isLoading}
              placeholder={
                sessionId
                  ? 'Ask a question about your data... (Enter to send, Shift+Enter for new line)'
                  : 'Upload a CSV file first to start analyzing'
              }
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 
                         resize-none outline-none max-h-32 leading-relaxed"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || !sessionId || isLoading}
              className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 
                         disabled:bg-[#2a2a4a] disabled:cursor-not-allowed
                         flex items-center justify-center transition-all duration-200 flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">
            AI-generated code runs in a secure sandbox · Always verify insights
          </p>
        </div>
      </main>
    </div>
  );
}
