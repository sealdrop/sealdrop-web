import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import { usePageTitle } from "../lib/use-page-title.js";

declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

export function SecurityPage() {
  const { t } = useTranslation();
  usePageTitle(t("common.pageTitle.security"));

  const stored = t("securityPage.storage.stored", { returnObjects: true }) as string[];
  const notStored = t("securityPage.storage.notStored", { returnObjects: true }) as string[];
  const protects = t("securityPage.threatModel.protects", { returnObjects: true }) as string[];
  const doesNotProtect = t("securityPage.threatModel.doesNotProtect", { returnObjects: true }) as string[];

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.hero.eyebrow")}</p>
            <h2>{t("securityPage.hero.heading")}</h2>
          </div>
          <div className="l-summary-cards">
            <div className="l-summary-card l-summary-card--yes">
              <p className="l-eyebrow">{t("securityPage.cards.encryptedEyebrow")}</p>
              <p>{t("securityPage.cards.encryptedBody")}</p>
            </div>
            <div className="l-summary-card l-summary-card--no">
              <p className="l-eyebrow">{t("securityPage.cards.cannotReadEyebrow")}</p>
              <p>{t("securityPage.cards.cannotReadBody")}</p>
            </div>
            <div className="l-summary-card l-summary-card--warn">
              <p className="l-eyebrow">{t("securityPage.cards.linkIsKeyEyebrow")}</p>
              <p>{t("securityPage.cards.linkIsKeyBody")}</p>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.storage.eyebrow")}</p>
            <h2>{t("securityPage.storage.heading")}</h2>
          </div>
          <div className="l-table-wrap">
            <table className="l-table">
              <thead>
                <tr>
                  <th>{t("securityPage.storage.colStored")}</th>
                  <th>{t("securityPage.storage.colNeverStored")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(stored.length, notStored.length) }, (_, i) => (
                  <tr key={i}>
                    <td>{stored[i] ?? ""}</td>
                    <td>{notStored[i] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.primitives.eyebrow")}</p>
            <h2>{t("securityPage.primitives.heading")}</h2>
          </div>
          <div className="l-steps">
            <article className="l-card">
              <h3>{t("securityPage.primitives.aesTitle")}</h3>
              <p>{t("securityPage.primitives.aesBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.primitives.ecdhTitle")}</h3>
              <p>{t("securityPage.primitives.ecdhBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.primitives.webCryptoTitle")}</h3>
              <p>{t("securityPage.primitives.webCryptoBody")}</p>
            </article>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.sizePrivacy.eyebrow")}</p>
            <h2>{t("securityPage.sizePrivacy.heading")}</h2>
          </div>
          <div className="l-steps">
            <article className="l-card">
              <h3>{t("securityPage.sizePrivacy.standardTitle")}</h3>
              <p>{t("securityPage.sizePrivacy.standardBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.sizePrivacy.enhancedTitle")}</h3>
              <p>{t("securityPage.sizePrivacy.enhancedBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.sizePrivacy.maximumTitle")}</h3>
              <p>{t("securityPage.sizePrivacy.maximumBody")}</p>
            </article>
          </div>
          <div className="l-security-note" style={{ marginTop: "1.5rem" }}>
            <div className="l-security-note__copy">
              <p>
                {t("securityPage.sizePrivacy.note")}
              </p>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.buildIdentity.eyebrow")}</p>
            <h2>{t("securityPage.buildIdentity.heading")}</h2>
          </div>
          <div className="l-security-note">
            <div>
              <p>{t("securityPage.buildIdentity.intro")}</p>
            </div>
            <div className="l-security-note__copy">
              <p>
                <strong>{t("securityPage.buildIdentity.thisBuildLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.commit")}{" "}
                <code style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
                  {typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "—"}
                </code>
                {typeof __BUILD_TIME__ !== "undefined" && (
                  <>, {t("securityPage.buildIdentity.builtAt")} {new Date(__BUILD_TIME__).toUTCString()}</>
                )}
                .
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.checksumsLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.checksumsBefore")}
                <a href="/checksums.txt" style={{ textDecoration: "underline" }}>
                  /checksums.txt
                </a>
                {t("securityPage.buildIdentity.checksumsMiddle")}
                <code style={{ fontFamily: "monospace", fontSize: "0.9em" }}>sha256sum -c checksums.txt</code>
                {t("securityPage.buildIdentity.checksumsAfter")}
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.manifestLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.manifestBefore")}
                <a href="/build-manifest.json" style={{ textDecoration: "underline" }}>/build-manifest.json</a>
                {t("securityPage.buildIdentity.manifestMiddle")}
                <a href="/build-manifest-public.pem" style={{ textDecoration: "underline" }}>/build-manifest-public.pem</a>
                {t("securityPage.buildIdentity.manifestAfter")}
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.verifyLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.verifyBody")}
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.sourceLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.sourceBefore")}
                <a
                  href="https://github.com/sealdrop/sealdrop-web"
                  style={{ textDecoration: "underline" }}
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/sealdrop/sealdrop-web
                </a>
                {t("securityPage.buildIdentity.sourceAfter")}
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.safeBrowsingLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.safeBrowsingBefore")}
                <a
                  href="https://transparencyreport.google.com/safe-browsing/search?url=sealdrop.io"
                  style={{ textDecoration: "underline" }}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Safe Browsing
                </a>
                {t("securityPage.buildIdentity.safeBrowsingAfter")}
              </p>
              <p>
                <strong>{t("securityPage.buildIdentity.safeUseLabel")}</strong>{" "}
                {t("securityPage.buildIdentity.safeUseBody")}
              </p>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.threatModel.eyebrow")}</p>
            <h2>{t("securityPage.threatModel.heading")}</h2>
          </div>
          <div className="l-threat-grid">
            <div className="l-threat-col l-threat-col--yes">
              <h3>{t("securityPage.threatModel.protectsTitle")}</h3>
              <ul>
                {protects.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="l-threat-col l-threat-col--no">
              <h3>{t("securityPage.threatModel.doesNotProtectTitle")}</h3>
              <ul>
                {doesNotProtect.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.protectedLinks.eyebrow")}</p>
            <h2>{t("securityPage.protectedLinks.heading")}</h2>
          </div>
          <div className="l-security-note">
            <div>
              <p>{t("securityPage.protectedLinks.intro")}</p>
            </div>
            <div className="l-security-note__copy">
              <p>
                <strong>{t("securityPage.protectedLinks.howItWorksLabel")}</strong>{" "}
                {t("securityPage.protectedLinks.howItWorksBody")}
              </p>
              <p>
                <strong>{t("securityPage.protectedLinks.sendSeparatelyLabel")}</strong>{" "}
                {t("securityPage.protectedLinks.sendSeparatelyBody")}
              </p>
              <p>
                <strong>{t("securityPage.protectedLinks.neverLeavesLabel")}</strong>{" "}
                {t("securityPage.protectedLinks.neverLeavesBody")}
              </p>
              <p>
                <strong>{t("securityPage.protectedLinks.limitsLabel")}</strong>{" "}
                {t("securityPage.protectedLinks.limitsBody")}
              </p>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.responsibilities.eyebrow")}</p>
            <h2>{t("securityPage.responsibilities.heading")}</h2>
          </div>
          <div className="l-security-note">
            <div>
              <p>{t("securityPage.responsibilities.intro")}</p>
            </div>
            <div className="l-security-note__copy">
              <p>
                <strong>{t("securityPage.responsibilities.shareLinksLabel")}</strong>{" "}
                {t("securityPage.responsibilities.shareLinksBody")}
              </p>
              <p>
                <strong>{t("securityPage.responsibilities.guardOwnerLabel")}</strong>{" "}
                {t("securityPage.responsibilities.guardOwnerBody")}
              </p>
              <p>
                <strong>{t("securityPage.responsibilities.deviceMattersLabel")}</strong>{" "}
                {t("securityPage.responsibilities.deviceMattersBody")}
              </p>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("securityPage.privacy.eyebrow")}</p>
            <h2>{t("securityPage.privacy.heading")}</h2>
          </div>
          <div className="l-steps">
            <article className="l-card">
              <h3>{t("securityPage.privacy.noAccountsTitle")}</h3>
              <p>{t("securityPage.privacy.noAccountsBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.privacy.noAnalyticsTitle")}</h3>
              <p>{t("securityPage.privacy.noAnalyticsBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("securityPage.privacy.cloudflareTitle")}</h3>
              <p>{t("securityPage.privacy.cloudflareBody")}</p>
            </article>
          </div>
          <div className="l-section__action">
            <Link to="/privacy" className="l-btn l-btn--secondary">{t("securityPage.privacy.fullPolicyBtn")}</Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
