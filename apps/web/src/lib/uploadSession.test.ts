// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { saveUploadSession, loadUploadSession, clearUploadSession, type UploadSession } from "./uploadSession.js";

const BASE: UploadSession = {
  file_id: "abc123",
  key_b64: "AAEC",
  file_iv: "BBCD",
  chunk_count: 4,
  filename: "test.txt",
  size_bytes: 1024,
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  expiry_preset: "1-day",
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("saveUploadSession / loadUploadSession", () => {
  it("round-trips a session", () => {
    saveUploadSession(BASE);
    expect(loadUploadSession()).toEqual(BASE);
  });

  it("includes optional fields", () => {
    const s: UploadSession = {
      ...BASE,
      padded_size_bytes: 2048,
      delete_token: "tok",
      passphrase: "hunter2",
      use_access_code: true,
      want_delete_link: true,
    };
    saveUploadSession(s);
    expect(loadUploadSession()).toEqual(s);
  });

  it("returns null when nothing stored", () => {
    expect(loadUploadSession()).toBeNull();
  });

  it("returns null and clears when expires_at is in the past", () => {
    saveUploadSession({ ...BASE, expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(loadUploadSession()).toBeNull();
    expect(sessionStorage.getItem("sd_upload_session")).toBeNull();
  });

  it("returns null when stored value is invalid JSON", () => {
    sessionStorage.setItem("sd_upload_session", "not-json");
    expect(loadUploadSession()).toBeNull();
  });
});

describe("clearUploadSession", () => {
  it("removes a stored session", () => {
    saveUploadSession(BASE);
    clearUploadSession();
    expect(loadUploadSession()).toBeNull();
  });

  it("is a no-op when nothing stored", () => {
    expect(() => clearUploadSession()).not.toThrow();
  });
});
