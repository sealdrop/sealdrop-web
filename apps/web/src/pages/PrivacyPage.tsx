import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import { usePageTitle } from "../lib/use-page-title.js";

export function PrivacyPage() {
  const { t, i18n } = useTranslation();
  usePageTitle(t("common.pageTitle.privacy"));

  const notStoredItems = t("privacy.whatNotStored.items", { returnObjects: true }) as string[];
  const proWaitlistPrivacy = i18n.resolvedLanguage === "cs" ? {
    title: "Pilotní seznam SealDrop Pro",
    body: "Pokud se dobrovolně přihlásíte do pilotu SealDrop Pro, uložíme váš pracovní e-mail, profesi, frekvenci přijímání dokumentů, jazyk, zdroj kampaně a čas souhlasu. Použijeme je pouze pro výzkum a pilot. Neaktivní záznamy smažeme nejpozději do 90 dnů. Souhlas můžete odvolat na pro@sealdrop.io. Tyto údaje nejsou propojeny s vašimi šifrovanými přenosy.",
  } : i18n.resolvedLanguage === "mk" ? {
    title: "Пилот-листа за SealDrop Pro",
    body: "Ако доброволно се приклучите на пилотот SealDrop Pro, ги чуваме вашата службена е-пошта, професија, зачестеност на примање документи, јазик, извор на кампањата и времето на согласност. Ги користиме само за истражувањето и пилотот. Неактивните записи се бришат во рок од 90 дена. Согласноста може да ја повлечете преку pro@sealdrop.io. Овие податоци не се поврзани со вашите шифрирани преноси.",
  } : {
    title: "SealDrop Pro pilot waitlist",
    body: "If you voluntarily join the SealDrop Pro pilot, we store your work email, profession, document-receipt frequency, language, campaign source, and consent time. We use them only for research and the pilot. Inactive records are deleted within 90 days. You may withdraw consent at pro@sealdrop.io. This data is not linked to your encrypted transfers.",
  };

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
            <h2>{proWaitlistPrivacy.title}</h2>
            <p>{proWaitlistPrivacy.body}</p>
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
