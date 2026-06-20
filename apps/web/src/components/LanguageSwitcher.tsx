import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "EN", aria: "English" },
  { code: "cs", label: "CS", aria: "Česky" },
  { code: "mk", label: "МК", aria: "Македонски" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => i18n.language.startsWith(l.code))?.code ?? "en";

  return (
    <div className="lang-switcher">
      {LANGS.map((lang, idx) => (
        <span key={lang.code}>
          {idx > 0 && <span className="lang-sep">|</span>}
          <button
            className={`lang-btn${current === lang.code ? " lang-btn--active" : ""}`}
            onClick={() => void i18n.changeLanguage(lang.code)}
            // a11y: 2.5.3 - accessible name must contain the visible label text
            aria-label={`${lang.label}: ${lang.aria}`}
            aria-current={current === lang.code ? "true" : undefined}
          >
            {lang.label}
          </button>
        </span>
      ))}
    </div>
  );
}
