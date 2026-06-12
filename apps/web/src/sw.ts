/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { saveSharedTargetPayload } from "./lib/share-target.js";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

/**
 * Streaming-download relay: lets the page hand off a ReadableStream of
 * decrypted bytes to the browser's download manager without buffering the
 * whole file in page memory. The page posts a MessagePort tagged with a
 * one-time token, then navigates to /__sw-download/<token>; this fetch
 * handler turns the port's messages into the response body.
 */
const downloadPorts = new Map<string, MessagePort>();

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string; token?: string } | undefined;
  if (data?.type === "register-download" && data.token) {
    const port = event.ports[0];
    if (port) downloadPorts.set(data.token, port);
  }
});

const DOWNLOAD_PATH = /^\/__sw-download\/([^/]+)$/;
const SHARE_TARGET_PATH = "/send/shared";

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.pathname === SHARE_TARGET_PATH && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  const match = DOWNLOAD_PATH.exec(url.pathname);
  if (!match) return;

  const token = match[1] as string;
  const port = downloadPorts.get(token);
  downloadPorts.delete(token);

  if (!port) {
    event.respondWith(new Response("Not found", { status: 404 }));
    return;
  }

  const filename = url.searchParams.get("filename") ?? "download";
  const size = url.searchParams.get("size");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      port.onmessage = (e: MessageEvent<ArrayBuffer | null>) => {
        if (e.data === null) {
          controller.close();
          port.close();
          return;
        }
        controller.enqueue(new Uint8Array(e.data));
      };
      port.start();
    },
    cancel() {
      port.postMessage("cancel");
      port.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
  };
  if (size) headers["Content-Length"] = size;

  event.respondWith(new Response(stream, { headers }));
});

async function handleShareTarget(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.getAll("file").find((value): value is File => value instanceof File && value.size > 0);
    const title = stringValue(formData.get("title"));
    const text = stringValue(formData.get("text"));
    const url = stringValue(formData.get("url"));

    await saveSharedTargetPayload({
      ...(file ? { file } : {}),
      ...(title ? { title } : {}),
      ...(text ? { text } : {}),
      ...(url ? { url } : {}),
      createdAt: Date.now(),
    });
  } catch {
    // Never log shared payloads: filenames, text, or URLs may be sensitive.
  }

  return Response.redirect(new URL("/send/shared", request.url), 303);
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
