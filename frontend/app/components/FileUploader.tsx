'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

interface SchemaColumn {
  column: string;
  type: string;
}

interface UploadResult {
  session_id: string;
  tables: string[];
  schemas: Record<string, SchemaColumn[]>;
  sample_rows: Record<string, Record<string, unknown>[]>;
  eda_summary: string;
  suggested_questions: string[];
}

interface FileUploaderProps {
  onUploadSuccess: (result: UploadResult) => void;
  onQuestionSelect: (q: string) => void;
}

export default function FileUploader({ onUploadSuccess, onQuestionSelect }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data: UploadResult = await res.json();
      setUploadResult(data);
      onUploadSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (uploadResult) {
    return (
      <div className="space-y-4">
        {/* Success Banner */}
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-medium text-sm">Data loaded successfully</p>
            <p className="text-gray-400 text-xs">{uploadResult.tables.join(', ')}</p>
          </div>
        </div>

        {/* EDA Summary */}
        <div className="bg-[#1e1e3a] rounded-xl p-4 border border-[#2a2a4a]">
          <h3 className="text-purple-400 font-semibold text-sm mb-2">📊 Dataset Summary</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{uploadResult.eda_summary}</p>
        </div>

        {/* Schema Preview */}
        <div className="bg-[#1e1e3a] rounded-xl p-4 border border-[#2a2a4a]">
          <h3 className="text-purple-400 font-semibold text-sm mb-3">📋 Schema</h3>
          {Object.entries(uploadResult.schemas).map(([table, cols]) => (
            <div key={table} className="mb-3">
              <p className="text-white font-mono text-xs mb-1 text-blue-400">{table}</p>
              <div className="grid grid-cols-2 gap-1">
                {cols.map(col => (
                  <div key={col.column} className="flex items-center gap-1.5 bg-[#12122a] rounded px-2 py-1">
                    <span className="text-gray-300 text-xs truncate">{col.column}</span>
                    <span className="text-purple-400 text-xs ml-auto">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Questions */}
        <div className="bg-[#1e1e3a] rounded-xl p-4 border border-[#2a2a4a]">
          <h3 className="text-purple-400 font-semibold text-sm mb-3">💡 Suggested Questions</h3>
          <div className="space-y-2">
            {uploadResult.suggested_questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onQuestionSelect(q)}
                className="w-full text-left text-xs text-gray-300 bg-[#12122a] hover:bg-purple-600/20 
                           hover:text-purple-300 border border-[#2a2a4a] hover:border-purple-500/40 
                           rounded-lg px-3 py-2 transition-all duration-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-[#2a2a4a] hover:border-purple-500/50 bg-[#1a1a2e]'
          }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-purple-400' : 'text-gray-500'}`} />
        <p className="text-gray-300 font-medium text-sm">
          {isDragging ? 'Drop your CSV files here' : 'Drag & drop CSV files here'}
        </p>
        <p className="text-gray-500 text-xs mt-1">or click to browse · Multiple files supported</p>
        <input
          id="file-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#1e1e3a] rounded-lg px-3 py-2 border border-[#2a2a4a]">
              <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300 text-xs flex-1 truncate">{f.name}</span>
              <span className="text-gray-500 text-xs">{(f.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 
                       text-white font-semibold text-sm rounded-xl transition-all duration-200
                       disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing dataset...
              </>
            ) : (
              `Upload ${files.length} file${files.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
