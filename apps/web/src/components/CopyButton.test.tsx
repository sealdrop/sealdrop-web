// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton.js";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";

afterEach(() => {
  cleanup();
});

async function setupI18n() {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        translation: {
          copyBtn: { copy: "Copy", copied: "Copied!" },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
}

function renderCopyButton(props?: { text?: string; label?: string; ariaLabel?: string }) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CopyButton
        text={props?.text ?? "test-value"}
        {...(props?.label !== undefined ? { label: props.label } : {})}
        {...(props?.ariaLabel !== undefined ? { ariaLabel: props.ariaLabel } : {})}
      />
    </I18nextProvider>,
  );
}

describe("CopyButton", () => {
  it("renders with Copy text by default", async () => {
    await setupI18n();
    renderCopyButton();
    expect(screen.getByRole("button")).toHaveTextContent("Copy");
  });

  it("copies text to clipboard on click", async () => {
    await setupI18n();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderCopyButton({ text: "hello-world" });
    await userEvent.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith("hello-world");
  });

  it("shows 'Copied!' after clicking", async () => {
    await setupI18n();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    renderCopyButton();
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("Copied!");
  });

  it("applies aria-label when provided", async () => {
    await setupI18n();
    renderCopyButton({ ariaLabel: "Copy link" });
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Copy link");
  });

  it("handles clipboard API failure gracefully", async () => {
    await setupI18n();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });

    renderCopyButton();
    await userEvent.click(screen.getByRole("button"));
    // Should not throw, button stays as "Copy" (no state change on error)
    expect(screen.getByRole("button")).toHaveTextContent("Copy");
  });
});
