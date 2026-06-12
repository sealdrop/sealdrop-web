import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";

export function PrivacyPage() {
  const { t } = useTranslation();

  const notStoredItems = t("privacy.whatNotStored.items", { returnObjects: true }) as string[];

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <article className="l-prose">
          <p className="l-eyebrow">{t("privacy.eyebrow")}</p>
          <h1>{t("privacy.heading")}</h1>

          <div className="l-prose-section">
            <h2>{t("privacy.whatStored.title")}</h2>
            <p>{t("privacy.whatStored.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.whatNotStored.title")}</h2>
            <ul>
              {notStoredItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.retention.title")}</h2>
            <p>{t("privacy.retention.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.thirdParty.title")}</h2>
            <p>
              {t("privacy.thirdParty.bodyBefore")}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("privacy.thirdParty.cfLinkText")}
              </a>
              {t("privacy.thirdParty.bodyAfter")}
            </p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.cookies.title")}</h2>
            <p>{t("privacy.cookies.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.rights.title")}</h2>
            <p>{t("privacy.rights.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.changes.title")}</h2>
            <p>{t("privacy.changes.body")}</p>
          </div>

          <div className="l-prose-section">
            <h2>{t("privacy.contact.title")}</h2>
            <p>
              {t("privacy.contact.bodyBefore")}
              <a href="mailto:abuse@sealdrop.io">abuse@sealdrop.io</a>
              {t("privacy.contact.bodyAfter")}
            </p>
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
