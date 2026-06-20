const SESSION_KEY = "sd_upload_session";

export interface UploadSession {
  file_id: string;
  key_b64: string;           // base64url raw AES-GCM key (via keyToFragment)
  file_iv: string;           // base64url
  chunk_count: number;
  padded_size_bytes?: number;
  filename: string;
  size_bytes: number;
  expires_at: string;        // ISO — used to discard stale sessions on load
  delete_token?: string;
  expiry_preset: string;
  passphrase?: string;
  use_access_code?: boolean;
  want_delete_link?: boolean;
}

export function saveUploadSession(session: UploadSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* storage unavailable or quota exceeded — silent */ }
}

export function loadUploadSession(): UploadSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as UploadSession;
    if (new Date(s.expires_at) <= new Date()) {
      clearUploadSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearUploadSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
