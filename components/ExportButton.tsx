/**
 * ExportButton Component
 * Downloads all user data as JSON backup file
 */

'use client';

import { useState } from 'react';

interface ExportButtonProps {
  onExportComplete?: () => void;
}

export function ExportButton({ onExportComplete }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setError(null);

    try {
      const res = await fetch('/api/todos/export');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }

      // Get the blob and create download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || 'todos-backup.json';

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onExportComplete) {
        onExportComplete();
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        type="button"
      >
        {isExporting ? 'Exporting...' : '📥 Export Data'}
      </button>
      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
