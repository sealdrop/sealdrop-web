// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import { extractHandoffCode, HandoffQrScanner } from "./HandoffQrScanner.js";

void initReactI18next;

const resources = {
  en: {
    translation: {
      open: {
        scanBtn: "Scan QR code",
        scanStarting: "Starting camera…",
        scanStop: "Stop scan",
        scanError: "Could not scan. Enter the code manually instead.",
      },
    },
  },
};

beforeEach(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources,
    interpolation: { escapeValue: false },
  });
});

afterEach(() => {
  cleanup();
});

function renderScanner() {
  render(
    <I18nextProvider i18n={i18n}>
      <HandoffQrScanner onCode={() => {}} />
    </I18nextProvider>,
  );
}

describe("extractHandoffCode", () => {
  it("extracts a raw handoff code", () => {
    expect(extractHandoffCode("A7KP2M 482 913 774")).toBe("A7KP2M 482 913 774");
  });

  it("extracts a code embedded in scanned text", () => {
    expect(extractHandoffCode("Open with SealDrop: A7KP2M-482-913-774")).toBe("A7KP2M-482-913-774");
  });

  it("returns null when no handoff code is present", () => {
    expect(extractHandoffCode("https://sealdrop.io/open")).toBeNull();
  });
});

describe("HandoffQrScanner", () => {
  it("is hidden when getUserMedia is unavailable", () => {
    // jsdom has no mediaDevices — scanner should not render
    renderScanner();
    expect(screen.queryByRole("button", { name: "Scan QR code" })).not.toBeInTheDocument();
  });

  it("shows the scan button when getUserMedia is available", () => {
    // Simulate a browser that has camera support but no BarcodeDetector
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: () => Promise.resolve({} as MediaStream) },
      configurable: true,
    });
    renderScanner();
    expect(screen.getByRole("button", { name: "Scan QR code" })).toBeInTheDocument();
    // Restore
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
  });
});
