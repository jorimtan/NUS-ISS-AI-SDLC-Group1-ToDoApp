/**
 * ImportModal Component
 * Allows users to import todos from JSON backup with preview
 */

'use client';

import { useState } from 'react';

interface ImportPreview {
  valid: boolean;
  errors?: string[];
  preview?: {
    todos_to_import: number;
    tags_to_create: number;
    tags_to_merge: number;
    templates_to_import: number;
    subtasks_to_import: number;
  };
  mergeDetails?: {
    mergingTags: string[];
  };
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setIsLoadingPreview(true);

    // Read and preview
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/todos/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const previewData = await res.json();
      setPreview(previewData);
    } catch (error) {
      setPreview({
        valid: false,
        errors: ['Failed to parse JSON file. Please check the file format.'],
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function handleImport() {
    if (!file || !preview?.valid) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await res.json();
      onSuccess();
      handleClose();
      
      // Show success message after closing modal
      setTimeout(() => {
        alert(`✅ Import successful! Imported ${result.imported.todos} todos, ${result.imported.tags} tags, and ${result.imported.templates} templates.`);
      }, 100);
    } catch (error) {
      console.error('Import error:', error);
      alert(`❌ ${error instanceof Error ? error.message : 'Import failed. Please check the file and try again.'}`);
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPreview(null);
    setIsLoadingPreview(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">📤 Import Data</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* File Picker */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Select Backup File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm border border-gray-300 rounded-lg p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose a JSON backup file exported from this app
            </p>
          </div>

          {/* Loading Preview */}
          {isLoadingPreview && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600">Analyzing backup file...</p>
            </div>
          )}

          {/* Preview or Errors */}
          {preview && !isLoadingPreview && (
            <div className="mb-4 p-4 border rounded-lg">
              {preview.valid ? (
                <>
                  <h3 className="font-semibold mb-3 text-gray-900">Import Preview</h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>
                        <strong>{preview.preview!.todos_to_import}</strong> todo{preview.preview!.todos_to_import !== 1 ? 's' : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>
                        <strong>{preview.preview!.subtasks_to_import}</strong> subtask{preview.preview!.subtasks_to_import !== 1 ? 's' : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>
                        <strong>{preview.preview!.tags_to_create}</strong> new tag{preview.preview!.tags_to_create !== 1 ? 's' : ''}
                      </span>
                    </li>
                    {preview.preview!.tags_to_merge > 0 && (
                      <li className="flex items-center gap-2">
                        <span className="text-blue-600">🔄</span>
                        <span>
                          <strong>{preview.preview!.tags_to_merge}</strong> tag{preview.preview!.tags_to_merge !== 1 ? 's' : ''} merged (already exist)
                        </span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>
                        <strong>{preview.preview!.templates_to_import}</strong> template{preview.preview!.templates_to_import !== 1 ? 's' : ''}
                      </span>
                    </li>
                  </ul>

                  {preview.mergeDetails && preview.mergeDetails.mergingTags.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-blue-800">
                        <strong>Merging tags:</strong> {preview.mergeDetails.mergingTags.join(', ')}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        These tags already exist and will be reused for imported todos.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-semibold mb-2 text-red-600">Validation Errors</h3>
                  <ul className="text-sm space-y-1 text-red-600">
                    {preview.errors?.map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span>❌</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-600 mt-3">
                    Please fix these errors in your backup file and try again.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview?.valid || isImporting || isLoadingPreview}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {isImporting ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
