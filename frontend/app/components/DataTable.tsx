'use client';

interface DataTableProps {
  data: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
}

export default function DataTable({ data }: DataTableProps) {
  if (!data?.columns?.length || !data?.rows?.length) return null;

  return (
    <div className="bg-[#0d1117] border border-[#2a2a4a] rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-[#2a2a4a]">
        <span className="text-xs text-gray-500 font-mono">
          {data.rows.length} row{data.rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#1a1a2e]">
            <tr>
              {data.columns.map(col => (
                <th
                  key={col}
                  className="text-left px-3 py-2 text-purple-400 font-mono font-semibold 
                             border-b border-[#2a2a4a] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-[#1a1a2e] hover:bg-[#1e1e3a] transition-colors">
                {data.columns.map(col => (
                  <td key={col} className="px-3 py-1.5 text-gray-300 font-mono whitespace-nowrap">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-gray-600 italic">null</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
