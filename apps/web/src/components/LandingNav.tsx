import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

const FAB_ITEMS = [
  { to: "/how-it-works", labelKey: "landing.nav.howItWorks" },
  { to: "/security",     labelKey: "landing.nav.security" },
  { to: "/pro",          labelKey: "pro" },
  { to: "/receive",      labelKey: "landing.nav.createDropLink" },
  { to: "/send",         labelKey: "landing.nav.sendFile" },
] as const;

export function LandingNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <header className="l-nav">
        <div className="l-nav__inner">
          <Link to="/" className="l-brand" aria-label="SealDrop home">
            <BrandLogo height={36} />
          </Link>
          <nav className="l-nav__links" aria-label="Landing navigation">
            <Link to="/how-it-works">{t("landing.nav.howItWorks")}</Link>
            <Link to="/security">{t("landing.nav.security")}</Link>
            <Link to="/pro" className="l-nav__pro">
              <span>Pro</span>
              <span className="l-nav__pilot-badge"><i aria-hidden="true" />Pilot</span>
            </Link>
          </nav>
          <div className="l-nav__actions">
            <Link to="/receive" className="l-nav__cta">{t("landing.nav.createDropLink")}</Link>
            <Link to="/send" className="l-nav__cta">{t("landing.nav.sendFile")}</Link>
          </div>
          <div className="l-nav__lang">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div
        className={`l-fab__backdrop${open ? " l-fab__backdrop--open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="l-fab">
        <div
          className={`l-fab__items${open ? " l-fab__items--open" : ""}`}
          aria-hidden={!open}
        >
          {FAB_ITEMS.map(({ to, labelKey }, i) => (
            <Link
              key={to}
              to={to}
              className={`l-fab__item${to === "/pro" ? " l-nav__pro" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              {to === "/pro" ? <><span>Pro</span><span className="l-nav__pilot-badge"><i aria-hidden="true" />Pilot</span></> : t(labelKey)}
            </Link>
          ))}
        </div>
        <button
          className={`l-fab__trigger${open ? " l-fab__trigger--open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t("landing.nav.menu")}
          type="button"
        >
          <span className="l-fab__plus" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>
    </>
  );
}
