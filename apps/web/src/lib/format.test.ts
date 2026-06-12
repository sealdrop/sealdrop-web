// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { downloadStream, needsLargeDownloadWarning, isStreamingDownloadSupported, LARGE_DOWNLOAD_WARNING_BYTES } from "./format.js";

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[i]!);
      i++;
    },
  });
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>)["showSaveFilePicker"];
  delete (navigator as unknown as Record<string, unknown>)["serviceWorker"];
});

describe("downloadStream", () => {
  it("falls back to a Blob download when the File System Access API is unavailable", async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    const stream = streamFromChunks(chunks);

    let downloadedBlob: Blob | null = null;
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        downloadedBlob = blob;
        return "blob:fake";
      },
      revokeObjectURL: () => {},
    });

    await downloadStream("file.bin", stream);

    expect(downloadedBlob).not.toBeNull();
    const buf = new Uint8Array(await downloadedBlob!.arrayBuffer());
    expect(buf).toEqual(concat(chunks));
  });

  it("truncates trailing padding to maxBytes in the fallback path", async () => {
    const chunks = [new Uint8Array([1, 2, 3, 4, 5])];
    const stream = streamFromChunks(chunks);

    let downloadedBlob: Blob | null = null;
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        downloadedBlob = blob;
        return "blob:fake";
      },
      revokeObjectURL: () => {},
    });

    await downloadStream("file.bin", stream, { maxBytes: 3 });

    const buf = new Uint8Array(await downloadedBlob!.arrayBuffer());
    expect(buf).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("streams chunks directly to disk via the File System Access API without buffering a Blob", async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    const stream = streamFromChunks(chunks);

    const written: Uint8Array[] = [];
    let closed = false;
    const writable = {
      write: vi.fn(async (data: Uint8Array) => { written.push(data); }),
      close: vi.fn(async () => { closed = true; }),
    };
    const handle = { createWritable: vi.fn(async () => writable) };
    const showSaveFilePicker = vi.fn(async () => handle);
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    const createObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    await downloadStream("file.bin", stream);

    expect(showSaveFilePicker).toHaveBeenCalledWith({ suggestedName: "file.bin" });
    expect(concat(written)).toEqual(concat(chunks));
    expect(closed).toBe(true);
    // No in-memory Blob should ever be created on the FSA path.
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("truncates trailing padding to maxBytes on the File System Access API path", async () => {
    const chunks = [new Uint8Array([1, 2, 3, 4, 5]), new Uint8Array([6, 7])];
    const stream = streamFromChunks(chunks);

    const written: Uint8Array[] = [];
    const writable = {
      write: vi.fn(async (data: Uint8Array) => { written.push(data); }),
      close: vi.fn(async () => {}),
    };
    const handle = { createWritable: vi.fn(async () => writable) };
    vi.stubGlobal("showSaveFilePicker", vi.fn(async () => handle));

    await downloadStream("file.bin", stream, { maxBytes: 4 });

    expect(concat(written)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("relays chunks through the service worker when FSA is unavailable but a SW controls the page", async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    const stream = streamFromChunks(chunks);

    const received: (Uint8Array | null)[] = [];
    let resolveDone: () => void;
    const allReceived = new Promise<void>((resolve) => { resolveDone = resolve; });

    const controllerPostMessage = vi.fn((_msg: unknown, transfer: Transferable[]) => {
      const port = transfer[0] as MessagePort;
      port.start();
      port.onmessage = (e: MessageEvent<ArrayBuffer | null>) => {
        if (e.data === null) {
          received.push(null);
          resolveDone();
          return;
        }
        received.push(new Uint8Array(e.data));
      };
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: { controller: { postMessage: controllerPostMessage } },
      configurable: true,
    });

    const createObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    await downloadStream("file.bin", stream, { totalBytes: 6 });
    await allReceived;

    expect(controllerPostMessage).toHaveBeenCalledTimes(1);
    const [msg] = controllerPostMessage.mock.calls[0]!;
    expect((msg as { type: string }).type).toBe("register-download");
    expect(createObjectURL).not.toHaveBeenCalled();

    expect(received.at(-1)).toBeNull();
    const dataChunks = received.filter((c): c is Uint8Array => c !== null);
    expect(concat(dataChunks)).toEqual(concat(chunks));

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain("/__sw-download/");
    expect(iframe!.src).toContain("size=6");
  });
});

describe("needsLargeDownloadWarning", () => {
  it("is false for small files regardless of browser support", () => {
    expect(needsLargeDownloadWarning(1024)).toBe(false);
  });

  it("is false for large files when the File System Access API is available", () => {
    vi.stubGlobal("showSaveFilePicker", vi.fn());
    expect(isStreamingDownloadSupported()).toBe(true);
    expect(needsLargeDownloadWarning(LARGE_DOWNLOAD_WARNING_BYTES + 1)).toBe(false);
  });

  it("is false for large files when a service worker controls the page", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { controller: { postMessage: vi.fn() } },
      configurable: true,
    });
    expect(needsLargeDownloadWarning(LARGE_DOWNLOAD_WARNING_BYTES + 1)).toBe(false);
  });

  it("is true for large files with no streaming download path available", () => {
    expect(needsLargeDownloadWarning(LARGE_DOWNLOAD_WARNING_BYTES + 1)).toBe(true);
  });
});
