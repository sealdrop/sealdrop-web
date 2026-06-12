import type {
  SendInitResponse,
  SendMetadataResponse,
  ReceiveInitResponse,
  ReceiveSessionResponse,
  ReceiveFileInitResponse,
  OwnerFilesResponse,
} from "@sealdrop/shared";

const BASE = import.meta.env["VITE_API_URL"] ?? "";

function segment(value: string | number): string {
  return encodeURIComponent(String(value));
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const status = res.status;
    if (status === 404) throw new ApiError("not_found", status);
    if (status === 410) throw new ApiError("gone", status);
    if (status === 413) throw new ApiError("too_large", status);
    throw new ApiError("server_error", status);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly code: "not_found" | "gone" | "too_large" | "server_error",
    public readonly status: number,
  ) {
    super(code);
  }
}

// ─── Send ────────────────────────────────────────────────────────────────────

export interface SendInitBody {
  size_bytes: number;
  expiry_preset: string;
  encrypted_metadata: string;
  metadata_iv: string;
  file_iv: string;
  chunk_count: number;
  want_delete_link?: boolean;
  turnstile_token?: string;
}

export async function sendInit(body: SendInitBody): Promise<SendInitResponse> {
  return req("/api/send/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendChunk(fileId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}/chunk/${segment(chunkIndex)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  if (!res.ok) throw new ApiError("server_error", res.status);
}

export async function sendComplete(fileId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}/complete`, { method: "PUT" });
  if (!res.ok) throw new ApiError("server_error", res.status);
}

export async function getSendMetadata(fileId: string): Promise<SendMetadataResponse> {
  return req(`/api/send/${segment(fileId)}/metadata`);
}

export async function getSendChunk(fileId: string, chunkIndex: number): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}/chunk/${segment(chunkIndex)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) throw new ApiError("not_found", res.status);
    throw new ApiError("server_error", res.status);
  }
  return res.arrayBuffer();
}

export async function deleteSendFile(fileId: string, deleteToken: string): Promise<void> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}?token=${encodeURIComponent(deleteToken)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    if (res.status === 404) throw new ApiError("not_found", res.status);
    throw new ApiError("server_error", res.status);
  }
}

export async function openSendFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}/open`, { method: "POST" });
  if (!res.ok) {
    if (res.status === 410) throw new ApiError("gone", res.status);
    if (res.status === 404) throw new ApiError("not_found", res.status);
    throw new ApiError("server_error", res.status);
  }
}

export async function getChunkStatus(fileId: string): Promise<number[]> {
  const res = await fetch(`${BASE}/api/send/${segment(fileId)}/chunks/status`);
  if (!res.ok) throw new ApiError("server_error", res.status);
  const data = await res.json() as { uploaded: number[] };
  return data.uploaded;
}

// ─── Receive ─────────────────────────────────────────────────────────────────

export interface ReceiveInitBody {
  public_key: string;
  expiry_preset: string;
  turnstile_token?: string;
}

export async function receiveInit(body: ReceiveInitBody): Promise<ReceiveInitResponse> {
  return req("/api/receive/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getReceiveSession(dropId: string): Promise<ReceiveSessionResponse> {
  return req(`/api/receive/${segment(dropId)}`);
}

export interface ReceiveFileInitBody {
  size_bytes: number;
  chunk_count: number;
  encrypted_metadata: string;
  metadata_iv: string;
  file_iv: string;
  wrapped_file_key: string;
  ephemeral_public_key: string;
  wrapped_key_iv: string;
}

export async function receiveFileInit(
  dropId: string,
  body: ReceiveFileInitBody,
): Promise<ReceiveFileInitResponse> {
  return req(`/api/receive/${segment(dropId)}/files/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function receiveChunk(
  dropId: string,
  receivedFileId: string,
  chunkIndex: number,
  data: ArrayBuffer,
): Promise<void> {
  const res = await fetch(`${BASE}/api/receive/${segment(dropId)}/files/${segment(receivedFileId)}/chunk/${segment(chunkIndex)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  if (!res.ok) throw new ApiError("server_error", res.status);
}

export async function receiveComplete(dropId: string, receivedFileId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/receive/${segment(dropId)}/files/${segment(receivedFileId)}/complete`, {
    method: "PUT",
  });
  if (!res.ok) throw new ApiError("server_error", res.status);
}

export async function getOwnerFiles(dropId: string): Promise<OwnerFilesResponse> {
  return req(`/api/receive/${segment(dropId)}/owner/files`);
}

export async function getOwnerFileChunk(
  dropId: string,
  receivedFileId: string,
  chunkIndex: number,
): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/api/receive/${segment(dropId)}/owner/files/${segment(receivedFileId)}/chunk/${segment(chunkIndex)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) throw new ApiError("not_found", res.status);
    throw new ApiError("server_error", res.status);
  }
  return res.arrayBuffer();
}

// ─── Open links (handoff) ─────────────────────────────────────────────────────

export interface CreateOpenLinkBody {
  handoff_id: string;
  encrypted_payload: string;
  payload_iv: string;
  kdf_salt: string;
  kdf_iterations: number;
}

export interface CreateOpenLinkResponse {
  handoff_id: string;
  expires_at: string;
}

export async function createOpenLink(body: CreateOpenLinkBody): Promise<CreateOpenLinkResponse> {
  return req("/api/open-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface OpenLinkPayload {
  encrypted_payload: string;
  payload_iv: string;
  kdf_salt: string;
  kdf_iterations: number;
  expires_at: string;
}

export async function getOpenLink(handoffId: string): Promise<OpenLinkPayload> {
  return req(`/api/open-links/${segment(handoffId)}`);
}

export async function consumeOpenLink(handoffId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/open-links/${segment(handoffId)}/consume`, { method: "POST" });
  if (!res.ok && res.status !== 204) throw new ApiError("server_error", res.status);
}
