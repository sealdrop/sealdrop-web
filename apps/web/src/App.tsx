import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route } from "react-router-dom";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
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

function PageFallback() {
  return <div className="page"><div className="card">Loading…</div></div>;
}

export function App() {
  return (
    <>
      <LanguageSwitcher />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/abuse" element={<AbuseReportPage />} />
          <Route path="/send" element={<SendPage />} />
          <Route path="/send/shared" element={<SendPage />} />
          <Route path="/receive" element={<ReceivePage />} />
          <Route path="/s/:fileId" element={<SendFilePage />} />
          <Route path="/s/:fileId/delete" element={<SendFileDeletePage />} />
          <Route path="/r/:dropId" element={<DropPage />} />
          <Route path="/r/:dropId/owner" element={<OwnerPage />} />
          <Route path="/open" element={<OpenPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
