// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary.js";
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
          common: {
            errorTitle: "Something went wrong",
            errorMessage: "The page failed to load. Please try again.",
            goToSealDrop: "Go to SealDrop",
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
}

function Bomb() {
  throw new Error("test error");
  return null;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", async () => {
    await setupI18n();
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <div>child content</div>
        </ErrorBoundary>
      </I18nextProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders error UI when child throws", async () => {
    await setupI18n();
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      </I18nextProvider>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("The page failed to load. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to SealDrop" })).toHaveAttribute("href", "/");
  });
});
