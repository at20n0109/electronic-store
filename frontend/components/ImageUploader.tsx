'use client';

import { useState } from 'react';
import { Upload } from '@phosphor-icons/react';
import { apiFetch } from '@/lib/api';

const UPLOAD_PATH = '/api/v1/uploads/images';

/** Longest edge of the uploaded image. Product cards never show more. */
const MAX_EDGE = 1600;
const QUALITY = 0.85;

/**
 * Phones shoot 4000px+ JPEGs. Downscaling in the browser keeps the request
 * that reaches the serverless function well inside its body limit, which
 * matters because the bytes have to travel through our own API.
 */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY),
    );
    if (!blob) throw new Error('Không thể nén ảnh.');
    return blob;
  } finally {
    bitmap.close();
  }
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
      const blob = await compress(file);
      const result = await apiFetch<{ id: string }>(UPLOAD_PATH, {
        method: 'POST',
        headers: { 'content-type': blob.type },
        body: blob,
      });
      // The API serves the object back from this origin, so the stored URL is
      // derived here rather than returned by the server.
      onUpload(`${UPLOAD_PATH}/${result.id}`);
      setFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Tải ảnh lên thất bại. Vui lòng thử lại.',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-600 transition-colors hover:border-red-500 dark:border-zinc-700 dark:text-zinc-400">
        <Upload size={20} />
        <span className="text-sm">
          {file ? `Đã chọn: ${file.name}` : 'Chọn ảnh'}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError('');
          }}
        />
      </label>
      {file && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => void upload()}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {uploading ? 'Đang tải...' : 'Tải lên'}
        </button>
      )}
      {uploading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ảnh đang được nén và gửi lên máy chủ, vui lòng đợi...
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
