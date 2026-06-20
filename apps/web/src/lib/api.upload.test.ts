import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSendUploadStatus, getReceiveUploadStatus, retryWithBackoff, ApiError } from "./api.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getSendUploadStatus", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET /api/send/:fileId/upload-status and returns parsed body", async () => {
    const expected = { part_count: 3, uploaded_parts: [0, 1] };
    mockFetch.mockResolvedValue(makeJsonResponse(expected));

    const result = await getSendUploadStatus("abc123");
    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/send/abc123/upload-status"),
      undefined,
    );
  });

  it("throws ApiError with code 'not_found' on 404", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ error: "not found" }, 404));

    await expect(getSendUploadStatus("abc123")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });

  it("encodes fileId in the URL path segment", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ part_count: 1, uploaded_parts: [] }));
    await getSendUploadStatus("file/with/slashes");
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).not.toContain("file/with/slashes");
    expect(url).toContain("file%2Fwith%2Fslashes");
  });
});

describe("getReceiveUploadStatus", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET /api/receive/:dropId/files/:receivedFileId/upload-status", async () => {
    const expected = { part_count: 2, uploaded_parts: [] };
    mockFetch.mockResolvedValue(makeJsonResponse(expected));

    const result = await getReceiveUploadStatus("drop1", "file1");
    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/receive/drop1/files/file1/upload-status"),
      undefined,
    );
  });

  it("throws ApiError with code 'not_found' on 404", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ error: "not found" }, 404));
    await expect(getReceiveUploadStatus("drop1", "file1")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("retryWithBackoff", () => {
  it("returns result immediately on first success without delay", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await retryWithBackoff(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on TypeError (network error) up to maxAttempts", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockResolvedValue("success");

    expect(await retryWithBackoff(fn, 3, 0)).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on ApiError with status 500", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError("server_error", 500))
      .mockResolvedValue("success");

    expect(await retryWithBackoff(fn, 3, 0)).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on ApiError with status 400", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError("server_error", 400));
    await expect(retryWithBackoff(fn, 3, 0)).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("DOES retry on ApiError with status 408 (timeout)", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError("server_error", 408))
      .mockResolvedValue("success");

    expect(await retryWithBackoff(fn, 3, 0)).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("DOES retry on ApiError with status 429 (rate limit)", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError("server_error", 429))
      .mockResolvedValue("success");

    expect(await retryWithBackoff(fn, 3, 0)).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all attempts", async () => {
    const err = new TypeError("always fails");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(retryWithBackoff(fn, 3, 0)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("delays between retries (base delay * attempt number)", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn()
        .mockRejectedValueOnce(new TypeError("fail"))
        .mockResolvedValue("ok");

      const promise = retryWithBackoff(fn, 3, 100);
      // First call fires immediately
      expect(fn).toHaveBeenCalledTimes(1);
      // Before the delay, the second call hasn't happened
      await vi.advanceTimersByTimeAsync(50);
      expect(fn).toHaveBeenCalledTimes(1);
      // After the delay (100ms × 1), the second call fires
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);
      await vi.runAllTimersAsync();
      expect(await promise).toBe("ok");
    } finally {
      vi.useRealTimers();
    }
  });
});
