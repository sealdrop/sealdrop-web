import { describe, it, expect } from "vitest";
import { formatExpiry, computePaddedTotalLength } from "./format.js";

describe("formatExpiry", () => {
  it("returns 'Open once' for remainingDownloads === 1", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(formatExpiry(future, 1)).toBe("Open once");
  });

  it("returns 'Expired' for past dates", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(formatExpiry(past)).toBe("Expired");
  });

  it("returns 'Expires in less than an hour' for near-future dates", () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    expect(formatExpiry(soon)).toBe("Expires in less than an hour");
  });

  it("returns hours for same-day expiry", () => {
    const hours4 = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    expect(formatExpiry(hours4)).toBe("Expires in 4 hours");
  });

  it("uses singular 'hour' for 1 hour", () => {
    const hour1 = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
    expect(formatExpiry(hour1)).toBe("Expires in 1 hour");
  });

  it("returns days for multi-day expiry", () => {
    const days3 = new Date(Date.now() + 3 * 86400 * 1000 + 60_000).toISOString();
    expect(formatExpiry(days3)).toBe("Expires in 3 days");
  });

  it("uses singular 'day' for 1 day", () => {
    const day1 = new Date(Date.now() + 1 * 86400 * 1000 + 60_000).toISOString();
    expect(formatExpiry(day1)).toBe("Expires in 1 day");
  });

  it("uses provided t function when available", () => {
    const future = new Date(Date.now() + 2 * 86400000 + 60_000).toISOString();
    const t = (key: string, opts?: { count?: number }) => {
      if (key === "expiry.openOnce") return "Otevřít jednou";
      if (key === "expiry.hours") return `Platnost vyprší za ${opts?.count} hodin`;
      if (key === "expiry.days") return `Platnost vyprší za ${opts?.count} dní`;
      return key;
    };
    expect(formatExpiry(future, 1, t)).toBe("Otevřít jednou");
    expect(formatExpiry(future, 999, t)).toBe("Platnost vyprší za 2 dní");
  });
});

describe("computePaddedTotalLength", () => {
  it("returns 0 for 0 chunks", () => {
    expect(computePaddedTotalLength(0, 0, 65536)).toBe(0);
  });

  it("pads the last chunk", () => {
    // 100 bytes file, 1 chunk of 65536 → padded to next multiple of 4096
    const result = computePaddedTotalLength(100, 1, 65536);
    expect(result).toBe(4096);
  });

  it("pads only the last chunk for multi-chunk files", () => {
    // 131072 + 100 bytes = 2 chunks, last chunk is 65636 bytes → padded to 69632
    const result = computePaddedTotalLength(131172, 2, 65536);
    expect(result).toBe(65536 + 69632);
  });
});
