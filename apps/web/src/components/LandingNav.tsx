import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";

export function LandingNav() {
  const { t } = useTranslation();
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
          <Link to="/receive" className="l-nav__cta l-nav__cta--ghost">{t("landing.nav.createDropLink")}</Link>
          <Link to="/send" className="l-nav__cta">{t("landing.nav.sendFile")}</Link>
        </div>
      </div>
    </header>
  );
}
