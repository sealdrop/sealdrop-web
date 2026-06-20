// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FilePicker } from "./FilePicker.js";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";

void initReactI18next;

const EN = {
  filePicker: {
    tapToChoose: "Choose a file",
    tapToChange: "Tap to change",
    hint: "Up to 200 GB",
    tooLarge: "File too large (max {{size}})",
    ariaChoose: "Choose a file to upload",
    ariaSelected: "Selected file {{name}}. Press Enter to choose a different file.",
  },
};
const CS = {
  filePicker: {
    tapToChoose: "Vyberte soubor",
    tapToChange: "Klepnutím změníte",
    hint: "Až 200 GB",
    tooLarge: "Soubor je příliš velký (max {{size}})",
    ariaChoose: "Vyberte soubor k nahrání",
    ariaSelected: "Vybraný soubor {{name}}. Stiskněte Enter pro výběr jiného souboru.",
  },
};

beforeEach(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: EN }, cs: { translation: CS } },
    interpolation: { escapeValue: false },
  });
});

afterEach(() => {
  cleanup();
});

describe("FilePicker i18n", () => {
  it("uses localized aria-label in English", () => {
    void i18n.changeLanguage("en");
    render(
      <I18nextProvider i18n={i18n}>
        <FilePicker file={null} onFile={() => {}} />
      </I18nextProvider>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Choose a file to upload");
  });

  it("uses localized aria-label in Czech", () => {
    void i18n.changeLanguage("cs");
    render(
      <I18nextProvider i18n={i18n}>
        <FilePicker file={null} onFile={() => {}} />
      </I18nextProvider>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Vyberte soubor k nahrání");
  });
});

