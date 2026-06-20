import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import "../landing.css";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="l-page">
      <LandingNav />
      <main>
        <section className="l-section" style={{ textAlign: "center", padding: "6rem 1.5rem" }}>
          <h1 style={{ fontSize: "5rem", fontWeight: 700, lineHeight: 1, marginBottom: "0.5rem" }}>404</h1>
          <p style={{ fontSize: "1.25rem", opacity: 0.7, marginBottom: "2rem" }}>
            {t("notFound.message", "This page doesn't exist or has been moved.")}
          </p>
          <Link to="/" className="l-btn l-btn--primary">
            {t("notFound.backToHome", "Back to home")}
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
