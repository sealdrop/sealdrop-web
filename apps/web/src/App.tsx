import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Routes, Route, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { LandingPage } from "./pages/LandingPage.js";

function lazyNamed<T extends ComponentType>(loader: () => Promise<{ [k: string]: unknown }>, exportName: string) {
  return lazy(() => loader().then((m) => ({ default: m[exportName] as T })));
}

const HowItWorksPage = lazyNamed(() => import("./pages/HowItWorksPage.js"), "HowItWorksPage");
const SecurityPage = lazyNamed(() => import("./pages/SecurityPage.js"), "SecurityPage");
const PrivacyPage = lazyNamed(() => import("./pages/PrivacyPage.js"), "PrivacyPage");
const TermsPage = lazyNamed(() => import("./pages/TermsPage.js"), "TermsPage");
const AbuseReportPage = lazyNamed(() => import("./pages/AbuseReportPage.js"), "AbuseReportPage");
const SendPage = lazyNamed(() => import("./pages/SendPage.js"), "SendPage");
const SendFilePage = lazyNamed(() => import("./pages/SendFilePage.js"), "SendFilePage");
const SendFileDeletePage = lazyNamed(() => import("./pages/SendFileDeletePage.js"), "SendFileDeletePage");
const ReceivePage = lazyNamed(() => import("./pages/ReceivePage.js"), "ReceivePage");
const DropPage = lazyNamed(() => import("./pages/DropPage.js"), "DropPage");
const OwnerPage = lazyNamed(() => import("./pages/OwnerPage.js"), "OwnerPage");
const OpenPage = lazyNamed(() => import("./pages/OpenPage.js"), "OpenPage");
const NotFoundPage = lazyNamed(() => import("./pages/NotFoundPage.js"), "NotFoundPage");
const ProPage = lazyNamed(() => import("./pages/ProPage.js"), "ProPage");

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PageFallback() {
  return null;
}

function LoadingBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!visible) return null;
  return <div className="loading-bar" aria-hidden="true" />;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const LANDING_ROUTES = new Set(["/", "/how-it-works", "/security", "/privacy", "/terms", "/abuse", "/pro", "/404"]);

export function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const showGlobalLang = !LANDING_ROUTES.has(location.pathname);

  return (
    <>
      <ScrollToTop />
      <LoadingBar />
      {/* a11y: 2.4.1 - skip link as first focusable element */}
      <a href="#main-content" className="skip-link">{t("common.skipToContent")}</a>
      {showGlobalLang && <LanguageSwitcher />}
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          {/* a11y: 2.4.1 - skip link target */}
          <div id="main-content" tabIndex={-1}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
                <Route path="/how-it-works" element={<PageTransition><HowItWorksPage /></PageTransition>} />
                <Route path="/security" element={<PageTransition><SecurityPage /></PageTransition>} />
                <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
                <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
                <Route path="/abuse" element={<PageTransition><AbuseReportPage /></PageTransition>} />
                <Route path="/pro" element={<PageTransition><ProPage /></PageTransition>} />
                <Route path="/send" element={<PageTransition><SendPage /></PageTransition>} />
                <Route path="/send/shared" element={<PageTransition><SendPage /></PageTransition>} />
                <Route path="/receive" element={<PageTransition><ReceivePage /></PageTransition>} />
                <Route path="/s/:fileId" element={<PageTransition><SendFilePage /></PageTransition>} />
                <Route path="/s/:fileId/delete" element={<PageTransition><SendFileDeletePage /></PageTransition>} />
                <Route path="/r/:dropId" element={<PageTransition><DropPage /></PageTransition>} />
                <Route path="/r/:dropId/owner" element={<PageTransition><OwnerPage /></PageTransition>} />
                <Route path="/open" element={<PageTransition><OpenPage /></PageTransition>} />
                <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </div>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
