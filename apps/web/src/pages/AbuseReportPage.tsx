import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";

export function AbuseReportPage() {
  const { t } = useTranslation();

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <article className="l-prose">
          <p className="l-eyebrow">{t("abuse.eyebrow")}</p>
          <h1>{t("abuse.title")}</h1>

          <div className="l-prose-section">
            <h2>{t("abuse.whatWeCan.heading")}</h2>
            <p>{t("abuse.whatWeCan.intro")}</p>
            <ul>
              <li>{t("abuse.whatWeCan.item1")}</li>
              <li>{t("abuse.whatWeCan.item2")}</li>
            </ul>
            <p>{t("abuse.whatWeCan.response")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("abuse.whatWeCannot.heading")}</h2>
            <p>{t("abuse.whatWeCannot.intro")}</p>
            <ul>
              <li>{t("abuse.whatWeCannot.item1")}</li>
              <li>{t("abuse.whatWeCannot.item2")}</li>
              <li>{t("abuse.whatWeCannot.item3")}</li>
              <li>{t("abuse.whatWeCannot.item4")}</li>
            </ul>
            <p>{t("abuse.whatWeCannot.note")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("abuse.whatToInclude.heading")}</h2>
            <p>{t("abuse.whatToInclude.intro")}</p>
            <ul>
              <li>{t("abuse.whatToInclude.item1")}</li>
              <li>{t("abuse.whatToInclude.item2")}</li>
              <li>{t("abuse.whatToInclude.item3")}</li>
            </ul>
          </div>

          <div className="l-prose-section">
            <h2>{t("abuse.contact.heading")}</h2>
            <p>
              {t("abuse.contact.body1Before")}
              <a href="mailto:abuse@sealdrop.io">abuse@sealdrop.io</a>
            </p>
            <p>{t("abuse.contact.body2")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("abuse.transparency.heading")}</h2>
            <p>{t("abuse.transparency.body1")}</p>
            <p>
              {t("abuse.transparency.body2Before")}
              <Link to="/security">{t("abuse.transparency.body2Link")}</Link>
              {t("abuse.transparency.body2After")}
            </p>
          </div>

          <div className="l-prose-section">
            <h2>{t("abuse.acceptableUse.heading")}</h2>
            <p>
              {t("abuse.acceptableUse.bodyBefore")}
              <Link to="/terms">{t("abuse.acceptableUse.bodyLink")}</Link>
              {t("abuse.acceptableUse.bodyAfter")}
            </p>
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
