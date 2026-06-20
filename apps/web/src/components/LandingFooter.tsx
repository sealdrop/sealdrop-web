import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { BuildBadge } from "./BuildBadge";

export function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="l-footer">
      <BrandLogo height={48} />
      <p>{t("landing.footer.tagline")}</p>
      <div className="l-footer__links">
        <Link to="/pro">SealDrop Pro</Link>
        <Link to="/how-it-works">{t("landing.footer.howItWorks")}</Link>
        <Link to="/security">{t("landing.footer.security")}</Link>
        <Link to="/privacy">{t("landing.footer.privacy")}</Link>
        <Link to="/terms">{t("landing.footer.terms")}</Link>
        <Link to="/abuse">{t("landing.footer.abuseAndLegal")}</Link>
        <a href="https://github.com/sealdrop/sealdrop-web" target="_blank" rel="noreferrer">
          {t("landing.footer.source")}
        </a>
      </div>
      <BuildBadge />
    </footer>
  );
}
