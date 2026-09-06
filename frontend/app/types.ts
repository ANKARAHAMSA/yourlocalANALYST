export interface QueryReport {
  id: string;
  timestamp: string;
  query: string;
  executiveSummary?: string;
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
  executionTimeMs?: number;
  attempts?: number;
  status: 'running' | 'completed' | 'error';
  steps?: string[];
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
