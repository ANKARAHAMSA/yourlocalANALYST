export interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
  isStreaming?: boolean;
  code?: string;
  codeLanguage?: string;
  chart?: {
    data: object[];
    layout: object;
    config?: object;
  };
  table?: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
  insights?: string[];
  attempts?: number;
  error?: string;
}

export interface UploadResult {
  session_id: string;
  tables: string[];
  schemas: Record<string, { column: string; type: string }[]>;
  sample_rows: Record<string, Record<string, unknown>[]>;
  eda_summary: string;
  suggested_questions: string[];
}
