'use client';

import { useState } from 'react';
import { Upload } from '@phosphor-icons/react';
import { apiFetch } from '@/lib/api';

interface UploadResult {
  key: string;
  uploadUrl: string;
  url: string;
}

export function ImageUploader({
  onUpload,
}: {
  onUpload: (url: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const presigned = await apiFetch<UploadResult>('/uploads/images', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type }),
      });
      await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      onUpload(presigned.url);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-600 transition-colors hover:border-red-500 dark:border-zinc-700 dark:text-zinc-400">
        <Upload size={20} />
        <span className="text-sm">Chọn ảnh</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          disabled={uploading}
          onClick={upload}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {uploading ? 'Đang tải...' : 'Tải lên'}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
