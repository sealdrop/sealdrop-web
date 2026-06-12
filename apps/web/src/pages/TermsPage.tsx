import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";

export function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <article className="l-prose">
          <p className="l-eyebrow">{t("terms.eyebrow")}</p>
          <h1>{t("terms.title")}</h1>

          <div className="l-prose-section">
            <h2>{t("terms.usingService.heading")}</h2>
            <p>{t("terms.usingService.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.acceptableUse.heading")}</h2>
            <p>{t("terms.acceptableUse.intro")}</p>
            <ul>
              <li>{t("terms.acceptableUse.item1")}</li>
              <li>{t("terms.acceptableUse.item2")}</li>
              <li>{t("terms.acceptableUse.item3")}</li>
              <li>{t("terms.acceptableUse.item4")}</li>
            </ul>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.contentEncryption.heading")}</h2>
            <p>{t("terms.contentEncryption.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.noWarranty.heading")}</h2>
            <p>{t("terms.noWarranty.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.takedowns.heading")}</h2>
            <p>{t("terms.takedowns.body1")}</p>
            <p>
              {t("terms.takedowns.body2Before")}
              <Link to="/abuse">{t("terms.takedowns.body2Link")}</Link>
              {t("terms.takedowns.body2After")}
            </p>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.liability.heading")}</h2>
            <p>{t("terms.liability.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("terms.changes.heading")}</h2>
            <p>{t("terms.changes.body")}</p>
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
