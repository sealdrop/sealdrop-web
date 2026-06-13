import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function LandingNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="l-nav">
      <div className="l-nav__inner">
        <Link to="/" className="l-brand" aria-label="SealDrop home">
          <BrandLogo height={36} />
        </Link>
        <nav className="l-nav__links" aria-label="Landing navigation">
          <Link to="/how-it-works">{t("landing.nav.howItWorks")}</Link>
          <Link to="/security">{t("landing.nav.security")}</Link>
        </nav>
        <div className="l-nav__actions">
          <Link to="/receive" className="l-nav__cta">{t("landing.nav.createDropLink")}</Link>
          <Link to="/send" className="l-nav__cta">{t("landing.nav.sendFile")}</Link>
        </div>
        <div className="l-nav__lang">
          <LanguageSwitcher />
        </div>
        <button
          className={`l-nav__burger${open ? " l-nav__burger--open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="l-mobile-menu"
          aria-label={t("landing.nav.menu")}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {open && (
        <div className="l-mobile-menu" id="l-mobile-menu" role="dialog" aria-label={t("landing.nav.menu")}>
          <nav className="l-mobile-menu__nav" aria-label="Mobile landing navigation">
            <Link to="/how-it-works" onClick={() => setOpen(false)}>{t("landing.nav.howItWorks")}</Link>
            <Link to="/security" onClick={() => setOpen(false)}>{t("landing.nav.security")}</Link>
            <Link to="/receive" onClick={() => setOpen(false)}>{t("landing.nav.createDropLink")}</Link>
            <Link to="/send" onClick={() => setOpen(false)}>{t("landing.nav.sendFile")}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
