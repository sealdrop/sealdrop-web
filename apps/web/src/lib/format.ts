export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatExpiry(expiresAt: string, remainingDownloads?: number): string {
  if (remainingDownloads === 1) return "Open once";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Expires in less than an hour";
  if (hours < 24) return `Expires in ${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
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

export interface DownloadStreamOptions {
  /** Truncate the stream to this many bytes (drops trailing padding). */
  maxBytes?: number;
  /** Total decoded file size, used for the Content-Length header on the service-worker download path. */
  totalBytes?: number;
  mimeType?: string;
}

/** True if `downloadStream` can write chunks straight to disk instead of buffering a Blob. */
export function isStreamingDownloadSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
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

/** Files larger than this trigger a memory-usage warning when no streaming download path is available. */
export const LARGE_DOWNLOAD_WARNING_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/** True if downloading `sizeBytes` on this browser will buffer the whole file in memory. */
export function needsLargeDownloadWarning(sizeBytes: number): boolean {
  if (sizeBytes <= LARGE_DOWNLOAD_WARNING_BYTES) return false;
  return !isStreamingDownloadSupported() && !isServiceWorkerDownloadSupported();
}

/**
 * Hands a byte stream to the active service worker, which serves it as a
 * normal browser download via /__sw-download/<token> (see src/sw.ts). Used
 * as the streaming fallback on browsers without the File System Access API
 * (Firefox/Safari with a registered service worker).
 */
async function downloadViaServiceWorker(
  filename: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  takeWithinLimit: (value: Uint8Array) => Uint8Array | null,
  totalBytes?: number,
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = takeWithinLimit(value);
      if (chunk === null) break;
      const buf = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      channel.port1.postMessage(buf, [buf]);
    }
  } finally {
    channel.port1.postMessage(null);
    setTimeout(() => iframe.remove(), 10_000);
  }
}

/**
 * Saves a decrypted byte stream to disk without buffering the whole file in
 * memory. Prefers the File System Access API (writes chunks straight to
 * disk), then a service-worker relay (streams to the download manager), and
 * falls back to assembling a Blob only when neither is available — in which
 * case `needsLargeDownloadWarning` flags the memory cost to the caller.
 */
export async function downloadStream(
  filename: string,
  stream: ReadableStream<Uint8Array>,
  options: DownloadStreamOptions = {},
): Promise<void> {
  const { maxBytes, totalBytes, mimeType } = options;
  const reader = stream.getReader();
  let written = 0;

  function takeWithinLimit(value: Uint8Array): Uint8Array | null {
    if (maxBytes === undefined) return value;
    const remaining = maxBytes - written;
    if (remaining <= 0) return null;
    return value.byteLength > remaining ? value.slice(0, remaining) : value;
  }

  if (isStreamingDownloadSupported()) {
    const writable = await (window as unknown as SaveFilePickerWindow)
      .showSaveFilePicker({ suggestedName: filename })
      .then((handle) => handle.createWritable());

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = takeWithinLimit(value);
        if (chunk === null) break;
        await writable.write(chunk);
        written += chunk.byteLength;
      }
    } finally {
      await writable.close();
    }
    return;
  }

  if (isServiceWorkerDownloadSupported()) {
    await downloadViaServiceWorker(filename, reader, takeWithinLimit, totalBytes ?? maxBytes);
    return;
  }

  const chunks: BlobPart[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = takeWithinLimit(value);
    if (chunk === null) break;
    chunks.push(chunk as BlobPart);
    written += chunk.byteLength;
  }
  triggerDownload(new Blob(chunks, mimeType ? { type: mimeType } : undefined), filename);
}
