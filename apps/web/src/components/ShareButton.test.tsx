// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import { ShareButton } from "./ShareButton.js";

void initReactI18next;

const resources = {
  en: {
    translation: {
      shareBtn: {
        share: "Share",
        shared: "Shared",
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
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
});

function renderButton(text = "https://sealdrop.io/s/test#key=secret") {
  render(
    <I18nextProvider i18n={i18n}>
      <ShareButton text={text} />
    </I18nextProvider>,
  );
}

describe("ShareButton", () => {
  it("is hidden when Web Share is unavailable", () => {
    renderButton();
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
  });

  it("calls navigator.share with the provided text", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    renderButton();

    await userEvent.click(await screen.findByRole("button", { name: "Share" }));

    expect(share).toHaveBeenCalledWith({
      title: "SealDrop",
      text: "https://sealdrop.io/s/test#key=secret",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Shared" })).toBeVisible());
  });
});
