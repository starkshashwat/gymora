'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';

interface LogoUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

export default function LogoUploader({
  value,
  onChange,
  label = 'Gym Logo',
  description = 'Upload logo image (PNG, JPG, SVG, WebP up to 3MB)',
  className = '',
}: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>(value && value.startsWith('http') ? 'url' : 'upload');
  const [urlInput, setUrlInput] = useState(value && value.startsWith('http') ? value : '');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB in size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setError(null);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-200">
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'upload' ? 'url' : 'upload');
            setError(null);
          }}
          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1 transition"
        >
          {mode === 'upload' ? (
            <>
              <LinkIcon className="h-3 w-3" />
              <span>Paste URL instead</span>
            </>
          ) : (
            <>
              <Upload className="h-3 w-3" />
              <span>Upload file instead</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* When a logo is already selected/uploaded */}
      {value ? (
        <div className="flex items-center gap-3.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Gym Logo Preview"
              className="h-full w-full object-contain p-1"
              onError={() => setError('Could not load the provided image preview.')}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="truncate">Logo uploaded</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              Appears on QR reception page & member receipts
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove Logo"
              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : mode === 'upload' ? (
        /* Dropzone mode */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              <span className="text-emerald-600 dark:text-emerald-400 underline">Tap to upload</span> or drag and drop
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>
      ) : (
        /* URL paste mode */
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition"
          >
            Apply
          </button>
        </div>
      )}

      {/* Hidden native file input supporting mobile gallery & camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
