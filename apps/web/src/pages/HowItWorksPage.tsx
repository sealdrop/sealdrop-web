import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";

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
  const [tab, setTab] = useState<Tab>("send");

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
        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("howItWorks.eyebrow")}</p>
            <h2>{t("howItWorks.heading")}</h2>
          </div>
          <div className="l-tab-switcher" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "send"}
              className={`l-tab${tab === "send" ? " l-tab--active" : ""}`}
              onClick={() => setTab("send")}
            >
              {t("howItWorks.tabSend")}
            </button>
            <button
              role="tab"
              aria-selected={tab === "receive"}
              className={`l-tab${tab === "receive" ? " l-tab--active" : ""}`}
              onClick={() => setTab("receive")}
            >
              {t("howItWorks.tabReceive")}
            </button>
          </div>
          {tab === "send" ? <StepList steps={SEND_STEPS} /> : <StepList steps={RECEIVE_STEPS} />}
        </section>

        <section className="l-section">
          <div className="l-section__heading">
            <p className="l-eyebrow">{t("howItWorks.expiry.eyebrow")}</p>
            <h2>{t("howItWorks.expiry.heading")}</h2>
          </div>
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
