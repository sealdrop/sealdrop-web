import { useId } from "react";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import { FadeIn } from "../components/FadeIn";
import { usePageTitle } from "../lib/use-page-title.js";

type Tab = "send" | "receive";

type Step = { title: string; body: string };

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="l-steps-detail">
      {steps.map((step, i) => (
        <div className="l-step-row" key={i}>
          <span className="l-step-number">{i + 1}</span>
          <div className="l-step-row__body">
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HowItWorksPage() {
  const { t } = useTranslation();
  usePageTitle(t("common.pageTitle.howItWorks"));
  const [tab, setTab] = useState<Tab>("send");
  const tabId = useId();
  const sendPanelId = `${tabId}-send`;
  const receivePanelId = `${tabId}-receive`;

  const SEND_STEPS: Step[] = [
    { title: t("howItWorks.send.s1Title"), body: t("howItWorks.send.s1Body") },
    { title: t("howItWorks.send.s2Title"), body: t("howItWorks.send.s2Body") },
    { title: t("howItWorks.send.s3Title"), body: t("howItWorks.send.s3Body") },
    { title: t("howItWorks.send.s4Title"), body: t("howItWorks.send.s4Body") },
    { title: t("howItWorks.send.s5Title"), body: t("howItWorks.send.s5Body") },
    { title: t("howItWorks.send.s6Title"), body: t("howItWorks.send.s6Body") },
    { title: t("howItWorks.send.s7Title"), body: t("howItWorks.send.s7Body") },
  ];

  const RECEIVE_STEPS: Step[] = [
    { title: t("howItWorks.receive.s1Title"), body: t("howItWorks.receive.s1Body") },
    { title: t("howItWorks.receive.s2Title"), body: t("howItWorks.receive.s2Body") },
    { title: t("howItWorks.receive.s3Title"), body: t("howItWorks.receive.s3Body") },
    { title: t("howItWorks.receive.s4Title"), body: t("howItWorks.receive.s4Body") },
    { title: t("howItWorks.receive.s5Title"), body: t("howItWorks.receive.s5Body") },
    { title: t("howItWorks.receive.s6Title"), body: t("howItWorks.receive.s6Body") },
    { title: t("howItWorks.receive.s7Title"), body: t("howItWorks.receive.s7Body") },
  ];

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        {/* a11y: 1.3.1 - page must have exactly one h1; visible heading below is styled as h2 */}
        <h1 className="sr-only">{t("howItWorks.heading")}</h1>
        <section className="l-section">
          <FadeIn>
            <div className="l-section__heading">
              <p className="l-eyebrow">{t("howItWorks.eyebrow")}</p>
              <h2>{t("howItWorks.heading")}</h2>
            </div>
          </FadeIn>
          <div className="l-tab-switcher" role="tablist">
            <button
              role="tab"
              id={`${tabId}-send-tab`}
              aria-selected={tab === "send"}
              aria-controls={sendPanelId}
              className={`l-tab${tab === "send" ? " l-tab--active" : ""}`}
              onClick={() => setTab("send")}
            >
              {t("howItWorks.tabSend")}
            </button>
            <button
              role="tab"
              id={`${tabId}-receive-tab`}
              aria-selected={tab === "receive"}
              aria-controls={receivePanelId}
              className={`l-tab${tab === "receive" ? " l-tab--active" : ""}`}
              onClick={() => setTab("receive")}
            >
              {t("howItWorks.tabReceive")}
            </button>
          </div>
          <div role="tabpanel" id={sendPanelId} aria-labelledby={`${tabId}-send-tab`}>
            {tab === "send" && <StepList steps={SEND_STEPS} />}
          </div>
          <div role="tabpanel" id={receivePanelId} aria-labelledby={`${tabId}-receive-tab`} hidden={tab !== "receive"}>
            {tab === "receive" && <StepList steps={RECEIVE_STEPS} />}
          </div>
        </section>

        <section className="l-section">
          <FadeIn>
            <div className="l-section__heading">
              <p className="l-eyebrow">{t("howItWorks.expiry.eyebrow")}</p>
              <h2>{t("howItWorks.expiry.heading")}</h2>
            </div>
          </FadeIn>
          <div className="l-steps">
            <article className="l-card">
              <h3>{t("howItWorks.expiry.sendTitle")}</h3>
              <p>{t("howItWorks.expiry.sendBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("howItWorks.expiry.receiveTitle")}</h3>
              <p>{t("howItWorks.expiry.receiveBody")}</p>
            </article>
            <article className="l-card">
              <h3>{t("howItWorks.expiry.deletionTitle")}</h3>
              <p>{t("howItWorks.expiry.deletionBody")}</p>
            </article>
          </div>
        </section>

        <div className="l-section">
          <Link to="/security" className="l-btn l-btn--secondary">{t("howItWorks.securityLink")}</Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
