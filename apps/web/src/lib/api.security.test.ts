import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeOpenLink,
  deleteSendFile,
  getOwnerFileBlob,
  getReceiveSession,
  getSendMetadata,
  uploadReceivePart,
  uploadSendPart,
} from "./api.js";

function mockJsonFetch(body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockOkFetch() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array(0), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  return String(fetchMock.mock.calls[0]?.[0] ?? "");
}

describe("API client secret hygiene", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes path segments so URL fragments cannot enter API request URLs", async () => {
    const fetchMock = mockJsonFetch({});

    await getSendMetadata("file-id#key=secret");

    expect(requestedUrl(fetchMock)).toBe("/api/send/file-id%23key%3Dsecret/metadata");
    expect(requestedUrl(fetchMock)).not.toContain("#key=secret");
  });

  it("encodes receive and owner identifiers before building URLs", async () => {
    const fetchMock = mockJsonFetch({ drop_id: "ok" });

    await getReceiveSession("drop#owner=private");

    expect(requestedUrl(fetchMock)).toBe("/api/receive/drop%23owner%3Dprivate");
    expect(requestedUrl(fetchMock)).not.toContain("#owner=private");
  });

  it("keeps passphrases and access codes out of request URLs", async () => {
    const fetchMock = mockOkFetch();

    await uploadSendPart("file#key=secret", 0, new Blob());
    await uploadReceivePart("drop#owner=private", "received#wrapped=key", 1, new Blob());
    await getOwnerFileBlob("drop#owner=private", "received#wrapped=key");
    await consumeOpenLink("A7KP2M#482913774");

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toEqual([
      "/api/send/file%23key%3Dsecret/part/0",
      "/api/receive/drop%23owner%3Dprivate/files/received%23wrapped%3Dkey/part/1",
      "/api/receive/drop%23owner%3Dprivate/owner/files/received%23wrapped%3Dkey/blob",
      "/api/open-links/A7KP2M%23482913774/consume",
    ]);
    expect(urls.join("\n")).not.toMatch(/#|passphrase|access[_-]?code/i);
  });

  it("only sends delete tokens in the explicit token query parameter", async () => {
    const fetchMock = mockOkFetch();

    await deleteSendFile("file#key=secret", "delete#token&value");

    expect(requestedUrl(fetchMock)).toBe("/api/send/file%23key%3Dsecret?token=delete%23token%26value");
  });
});
