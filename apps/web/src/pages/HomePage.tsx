import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";

export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="page">
      <div className="card stack">
        <div className="stack-sm" style={{ textAlign: "center" }}>
          <BrandLogo height={56} style={{ margin: "0 auto" }} />
          <p className="subtitle" dangerouslySetInnerHTML={{ __html: t("landing.home.subtitle") }} />
        </div>

        <hr className="divider" />

        <div className="home-choices">
          <Link to="/send" className="choice-card">
            <span className="choice-card__icon" aria-hidden="true">📤</span>
            <span className="choice-card__title">{t("landing.home.sendTitle")}</span>
            <span className="choice-card__desc">{t("landing.home.sendDesc")}</span>
          </Link>
          <Link to="/receive" className="choice-card">
            <span className="choice-card__icon" aria-hidden="true">📥</span>
            <span className="choice-card__title">{t("landing.home.receiveTitle")}</span>
            <span className="choice-card__desc">{t("landing.home.receiveDesc")}</span>
          </Link>
        </div>

        <p className="safety-label" dangerouslySetInnerHTML={{ __html: t("landing.home.safety") }} />
      </div>
    </div>
  );
}
