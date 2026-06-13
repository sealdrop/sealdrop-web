import { paddedLength } from "@sealdrop/crypto";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function computePaddedTotalLength(sizeBytes: number, chunkCount: number, chunkSizeBytes: number): number {
  if (chunkCount === 0) return 0;
  const lastChunkOrigSize = sizeBytes - (chunkCount - 1) * chunkSizeBytes;
  return (chunkCount - 1) * chunkSizeBytes + paddedLength(lastChunkOrigSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExpiryTFunction = (key: string, options?: any) => string;

export function formatExpiry(expiresAt: string, remainingDownloads?: number, t?: ExpiryTFunction): string {
  const tx: ExpiryTFunction = t ?? ((key: string, opts?: Record<string, unknown>) => {
    if (key === "expiry.openOnce") return "Open once";
    if (key === "expiry.expired") return "Expired";
    if (key === "expiry.lessThanHour") return "Expires in less than an hour";
    const count = opts?.count ?? 0;
    if (key === "expiry.hours" || key === "expiry.hours_plural") return `Expires in ${count} hour${Number(count) !== 1 ? "s" : ""}`;
    if (key === "expiry.days" || key === "expiry.days_plural") return `Expires in ${count} day${Number(count) !== 1 ? "s" : ""}`;
    return key;
  });
  if (remainingDownloads === 1) return tx("expiry.openOnce");
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return tx("expiry.expired");
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return tx("expiry.lessThanHour");
  if (hours < 24) return tx("expiry.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return tx("expiry.days", { count: days });
}

export function triggerDownload(data: ArrayBuffer | Blob, filename: string, mimeType?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], mimeType ? { type: mimeType } : undefined);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

interface FileSystemWritableFileStreamLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

interface SaveFilePickerWindow {
  showSaveFilePicker(options?: { suggestedName?: string }): Promise<FileSystemFileHandleLike>;
}

interface OriginPrivateFileSystemDirectoryLike {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OriginPrivateFileSystemFileHandleLike>;
  removeEntry(name: string): Promise<void>;
}

interface OriginPrivateFileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
  getFile(): Promise<File>;
}

interface StorageManagerWithDirectory {
  getDirectory(): Promise<OriginPrivateFileSystemDirectoryLike>;
}

export interface DownloadStreamOptions {
  /** Truncate the stream to this many bytes (drops trailing padding). */
  maxBytes?: number;
  /** Total decoded file size, used for the Content-Length header on the service-worker download path. */
  totalBytes?: number;
  mimeType?: string;
  preparedWritable?: Promise<FileSystemWritableFileStreamLike> | FileSystemWritableFileStreamLike;
  /** Called once for each chunk of plaintext as it's written, in order, after maxBytes truncation. */
  onChunk?: (chunk: Uint8Array) => void | Promise<void>;
}

/** True if `downloadStream` can write chunks straight to disk instead of buffering a Blob. */
export function isStreamingDownloadSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function prepareStreamingDownload(filename: string): Promise<FileSystemWritableFileStreamLike> | undefined {
  if (!isStreamingDownloadSupported()) return undefined;
  return (window as unknown as SaveFilePickerWindow)
    .showSaveFilePicker({ suggestedName: filename })
    .then((handle) => handle.createWritable());
}

/**
 * True if `downloadStream` can hand the bytes off to an active service
 * worker, which streams them to the browser's download manager without
 * buffering the whole file in page memory.
 */
function isServiceWorkerDownloadSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller != null &&
    typeof MessageChannel !== "undefined"
  );
}

function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.storage != null &&
    typeof (navigator.storage as unknown as StorageManagerWithDirectory).getDirectory === "function"
  );
}

/** Files larger than this trigger a memory-usage warning when no streaming download path is available. */
export const LARGE_DOWNLOAD_WARNING_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/** True if downloading `sizeBytes` on this browser will buffer the whole file in memory. */
export function needsLargeDownloadWarning(sizeBytes: number): boolean {
  if (sizeBytes <= LARGE_DOWNLOAD_WARNING_BYTES) return false;
  return !isStreamingDownloadSupported() && !isOpfsSupported() && !isServiceWorkerDownloadSupported();
}

/**
 * Hands a byte stream to the active service worker, which serves it as a
 * normal browser download via /__sw-download/<token> (see src/sw.ts). Used
 * as the streaming fallback on browsers without the File System Access API
 * (Firefox/Safari with a registered service worker).
 */
// Kept alive until the *next* relayed download starts: removing the iframe
// while the browser is still writing the download to disk aborts it
// part-way through (the JS side finishes posting chunks long before the
// disk write catches up for large files), silently truncating the saved
// file even though integrity-checking already reported success.
let previousDownloadIframe: HTMLIFrameElement | null = null;

async function downloadViaServiceWorker(
  filename: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  takeWithinLimit: (value: Uint8Array) => Uint8Array | null,
  totalBytes?: number,
  onChunk?: (chunk: Uint8Array) => void | Promise<void>,
): Promise<void> {
  const controller = navigator.serviceWorker.controller;
  if (!controller) throw new Error("No active service worker");

  const token = crypto.randomUUID();
  const channel = new MessageChannel();
  controller.postMessage({ type: "register-download", token }, [channel.port2]);

  const params = new URLSearchParams({ filename });
  if (totalBytes !== undefined) params.set("size", String(totalBytes));

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `/__sw-download/${token}?${params.toString()}`;
  document.body.appendChild(iframe);

  previousDownloadIframe?.remove();
  previousDownloadIframe = iframe;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = takeWithinLimit(value);
      if (chunk === null) break;
      await onChunk?.(chunk);
      const buf = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      channel.port1.postMessage(buf, [buf]);
    }
  } finally {
    channel.port1.postMessage(null);
  }
}

async function downloadViaOpfs(
  filename: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  takeWithinLimit: (value: Uint8Array) => Uint8Array | null,
  mimeType?: string,
  onChunk?: (chunk: Uint8Array) => void | Promise<void>,
): Promise<void> {
  const root = await (navigator.storage as unknown as StorageManagerWithDirectory).getDirectory();
  const tempName = `.sealdrop-${crypto.randomUUID()}`;
  const handle = await root.getFileHandle(tempName, { create: true });
  const writable = await handle.createWritable();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = takeWithinLimit(value);
      if (chunk === null) break;
      await onChunk?.(chunk);
      await writable.write(chunk);
    }
  } finally {
    await writable.close();
  }

  try {
    const file = await handle.getFile();
    const downloadFile = file.name === filename && (!mimeType || file.type === mimeType)
      ? file
      : new File([file], filename, mimeType ? { type: mimeType } : undefined);
    triggerDownload(downloadFile, filename, mimeType);
  } finally {
    setTimeout(() => {
      void root.removeEntry(tempName).catch(() => {});
    }, 60_000);
  }
}

/**
 * Saves a decrypted byte stream to disk without buffering the whole file in
 * memory. Prefers the File System Access API (writes chunks straight to
 * disk), then the origin-private file system (also a direct disk write,
 * downloaded via a blob: URL once complete), then a service-worker relay
 * (streams to the download manager — fragile for very large files since it
 * depends on the worker staying alive and the browser's download manager
 * keeping pace with posted chunks), and finally falls back to assembling a
 * Blob in memory — in which case `needsLargeDownloadWarning` flags the
 * memory cost to the caller.
 */
export async function downloadStream(
  filename: string,
  stream: ReadableStream<Uint8Array>,
  options: DownloadStreamOptions = {},
): Promise<void> {
  const { maxBytes, totalBytes, mimeType, preparedWritable, onChunk } = options;
  const reader = stream.getReader();
  let written = 0;

  function takeWithinLimit(value: Uint8Array): Uint8Array | null {
    if (maxBytes === undefined) return value;
    const remaining = maxBytes - written;
    if (remaining <= 0) return null;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    written += chunk.byteLength;
    return chunk;
  }

  if (preparedWritable || isStreamingDownloadSupported()) {
    const writable = await (preparedWritable ?? prepareStreamingDownload(filename))!;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = takeWithinLimit(value);
        if (chunk === null) break;
        await onChunk?.(chunk);
        await writable.write(chunk);
      }
    } finally {
      await writable.close();
    }
    return;
  }

  if (isOpfsSupported()) {
    await downloadViaOpfs(filename, reader, takeWithinLimit, mimeType, onChunk);
    return;
  }

  if (isServiceWorkerDownloadSupported()) {
    await downloadViaServiceWorker(filename, reader, takeWithinLimit, totalBytes ?? maxBytes, onChunk);
    return;
  }

  const expectedBytes = maxBytes ?? totalBytes;
  if (expectedBytes !== undefined && expectedBytes > LARGE_DOWNLOAD_WARNING_BYTES) {
    throw new Error("Large downloads require the File System Access API, the origin-private file system, or an active service worker");
  }

  const chunks: BlobPart[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = takeWithinLimit(value);
    if (chunk === null) break;
    await onChunk?.(chunk);
    chunks.push(chunk as BlobPart);
  }
  triggerDownload(new Blob(chunks, mimeType ? { type: mimeType } : undefined), filename);
}
