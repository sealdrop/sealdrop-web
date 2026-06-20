// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import { InstallHint } from "./InstallHint.js";

void initReactI18next;

const resources = {
  en: {
    translation: {
      installHint: {
        title: "Use SealDrop like an app",
        ios: "On iPhone or iPad, tap Share, then Add to Home Screen.",
        android: "On Android, use your browser menu and choose Install app or Add to Home screen.",
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
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: false,
    media: "(display-mode: standalone)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderHint() {
  render(
    <I18nextProvider i18n={i18n}>
      <InstallHint />
    </I18nextProvider>,
  );
}

describe("InstallHint", () => {
  it("shows iOS instructions on iPhone", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("iPhone");

    renderHint();

    expect(await screen.findByText("Use SealDrop like an app")).toBeVisible();
    expect(screen.getByText(/Add to Home Screen/)).toBeVisible();
  });

  it("stays hidden on desktop browsers", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

    renderHint();

    expect(screen.queryByText("Use SealDrop like an app")).not.toBeInTheDocument();
  });
});
