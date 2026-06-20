import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import { FadeIn } from "../components/FadeIn";
import { usePageTitle } from "../lib/use-page-title.js";

function ButtonLink({ to, children, variant = "primary" }: { to: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return <Link to={to} className={`l-btn l-btn--${variant}`}>{children}</Link>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="l-badge">{children}</span>;
}

function UploadPreview() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number;

    function tilt(cx: number, cy: number) {
      const rect = el!.getBoundingClientRect();
      const pcx = rect.left + rect.width / 2;
      const pcy = rect.top + rect.height / 2;
      const dx = (cx - pcx) / rect.width;
      const dy = (cy - pcy) / rect.height;
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
      const rotY = clamp(dx * 14, 9);
      const rotX = clamp(-dy * 12, 7);
      el!.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    function onMouseMove(e: MouseEvent) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => tilt(e.clientX, e.clientY));
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => tilt(t.clientX, t.clientY));
    }

    function onTouchEnd() {
      cancelAnimationFrame(rafId);
      el!.style.transform = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      className="l-preview"
      aria-label={t("landing.preview.ariaLabel")}
      initial={{ opacity: 0, scale: 0.95, rotateY: -8 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="l-preview__top">
        <div>
          <p className="l-preview__eyebrow">{t("landing.preview.eyebrow")}</p>
          <h2>{t("landing.preview.heading")}</h2>
        </div>
        <Badge>{t("landing.preview.badge")}</Badge>
      </div>
      <div className="l-dropzone">
        <div className="l-dropzone__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 3v10m0-10 4 4m-4-4-4 4M5 14v3.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V14" />
          </svg>
        </div>
        <strong>{t("landing.preview.dropFile")}</strong>
        <span>{t("landing.preview.orChoose")}</span>
      </div>
      <div className="l-selected-file">
        <span className="l-selected-file__dot" />
        <div>
          <strong>{t("landing.preview.fileName")}</strong>
          <span>{t("landing.preview.fileSize")}</span>
        </div>
      </div>
      <div className="l-field-row">
        <span>{t("landing.preview.expires")}</span>
        <strong>{t("landing.preview.afterFirstDownload")}</strong>
      </div>
      <div className="l-progress" aria-hidden="true"><span /></div>
      <div className="l-link-state">
        <span>{t("landing.preview.linkPlaceholder")}</span>
        <button type="button">{t("landing.preview.copyLink")}</button>
      </div>
    </motion.div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="l-hero">
      <div className="l-hero__content">
        <motion.div
          className="l-kicker"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span /> {t("landing.hero.kicker")}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {t("landing.hero.heading")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {t("landing.hero.body")}
        </motion.p>
        <motion.div
          className="l-hero__actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <ButtonLink to="/send">{t("landing.hero.sendBtn")}</ButtonLink>
          <ButtonLink to="/receive" variant="secondary">{t("landing.hero.dropBtn")}</ButtonLink>
        </motion.div>
        <motion.div
          className="l-trust-note"
          aria-label="Trust notes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Badge>{t("landing.hero.badgeNoAccount")}</Badge>
          <Badge>{t("landing.hero.badgeEncrypted")}</Badge>
          <Badge>{t("landing.hero.badgeDeleted")}</Badge>
        </motion.div>
      </div>
      <UploadPreview />
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    [t("landing.howItWorks.step1Title"), t("landing.howItWorks.step1Body")],
    [t("landing.howItWorks.step2Title"), t("landing.howItWorks.step2Body")],
    [t("landing.howItWorks.step3Title"), t("landing.howItWorks.step3Body")],
  ];

  return (
    <section id="how-it-works" className="l-section">
      <FadeIn>
        <div className="l-section__heading">
          <p className="l-eyebrow">{t("landing.howItWorks.eyebrow")}</p>
          <h2>{t("landing.howItWorks.heading")}</h2>
        </div>
      </FadeIn>
      <div className="l-steps">
        {steps.map(([title, text], index) => (
          <FadeIn key={index} delay={index * 0.1}>
            <article className="l-card">
              <span className="l-step-number">{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={0.3}>
        <div className="l-section__action">
          <Link to="/how-it-works" className="l-btn l-btn--secondary">{t("landing.howItWorks.fullWalkthrough")}</Link>
        </div>
      </FadeIn>
    </section>
  );
}

function FeatureGrid() {
  const { t } = useTranslation();
  const features = [
    [t("landing.features.f1Title"), t("landing.features.f1Body")],
    [t("landing.features.f2Title"), t("landing.features.f2Body")],
    [t("landing.features.f3Title"), t("landing.features.f3Body")],
    [t("landing.features.f4Title"), t("landing.features.f4Body")],
    [t("landing.features.f5Title"), t("landing.features.f5Body")],
    [t("landing.features.f6Title"), t("landing.features.f6Body")],
  ];

  return (
    <section className="l-section l-section--wide">
      <FadeIn>
        <div className="l-section__heading">
          <p className="l-eyebrow">{t("landing.features.eyebrow")}</p>
          <h2>{t("landing.features.heading")}</h2>
        </div>
      </FadeIn>
      <div className="l-feature-grid">
        {features.map(([title, text], index) => (
          <FadeIn key={index} delay={index * 0.07}>
            <article className="l-card l-card--compact">
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function SecurityNote() {
  const { t } = useTranslation();
  return (
    <section id="security" className="l-section">
      <FadeIn>
        <div className="l-security-note">
          <div>
            <p className="l-eyebrow">{t("landing.security.eyebrow")}</p>
            <h2>{t("landing.security.heading")}</h2>
          </div>
          <div className="l-security-note__copy">
            <p>{t("landing.security.body1")}</p>
            <p>{t("landing.security.body2")}</p>
            <Link to="/security" className="l-btn l-btn--secondary">{t("landing.security.fullModel")}</Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function VerifySection() {
  const { t } = useTranslation();
  return (
    <section className="l-section">
      <FadeIn>
        <div className="l-security-note">
          <div>
            <p className="l-eyebrow">{t("landing.verify.eyebrow")}</p>
            <h2>{t("landing.verify.heading")}</h2>
          </div>
          <div className="l-security-note__copy">
            <p>{t("landing.verify.body")}</p>
            <ul className="l-verify-list">
              <li><Link to="/security">{t("landing.verify.linkSecurity")}</Link></li>
              <li><Link to="/security">{t("landing.verify.linkBuild")}</Link></li>
              <li><a href="/.well-known/security.txt">{t("landing.verify.linkSecurityTxt")}</a></li>
              <li><Link to="/privacy">{t("landing.verify.linkPrivacy")}</Link></li>
              <li><a href="https://github.com/sealdrop/sealdrop-web" target="_blank" rel="noreferrer">{t("landing.verify.linkSource")}</a></li>
            </ul>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation();
  return (
    <FadeIn>
      <section className="l-final">
        <div>
          <p className="l-eyebrow">{t("landing.cta.eyebrow")}</p>
          <h2>{t("landing.cta.heading")}</h2>
        </div>
        <div className="l-final__actions">
          <ButtonLink to="/send">{t("landing.cta.sendBtn")}</ButtonLink>
          <ButtonLink to="/receive" variant="secondary">{t("landing.cta.dropBtn")}</ButtonLink>
        </div>
      </section>
    </FadeIn>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  usePageTitle(t("common.pageTitle.home"));
  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <FeatureGrid />
        <SecurityNote />
        <VerifySection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
