import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InstallHint } from "../components/InstallHint.js";
import { MultiLineText } from "../components/MultiLineText.js";
import { HandoffQrScanner } from "../components/HandoffQrScanner.js";
import { parseHandoffCode, decryptHandoffUrl } from "@sealdrop/crypto";
import { getOpenLink, consumeOpenLink, ApiError } from "../lib/api.js";
import { usePageTitle } from "../lib/use-page-title.js";

type Step = "idle" | "opening" | "error";

export function OpenPage() {
  const { t } = useTranslation();
  usePageTitle(t("common.pageTitle.open"));
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("idle");

  async function handleOpen() {
    const parsed = parseHandoffCode(code);
    if (!parsed) {
      setStep("error");
      return;
    }
    setStep("opening");
    try {
      const payload = await getOpenLink(parsed.handoffId);
      const fullUrl = await decryptHandoffUrl(parsed.secret, {
        encryptedPayload: payload.encrypted_payload,
        payloadIv: payload.payload_iv,
        kdfSalt: payload.kdf_salt,
        kdfIterations: payload.kdf_iterations,
      });
      consumeOpenLink(parsed.handoffId).catch(() => {});
      window.location.href = fullUrl;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) {
        console.error("open handoff failed:", err);
      }
      setStep("error");
    }
  }

  return (
    <div className="page">
      <div className="card stack">
        <div className="nav">
          <a className="back" href="/">{t("common.back")}</a>
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 className="title">{t("open.title")}</h1>
          <p className="subtitle">{t("open.subtitle")}</p>
        </div>
        <InstallHint />

        <div className="stack-sm">
          {/* a11y: 3.3.2 - associate visible field with an accessible label */}
          <label className="sr-only" htmlFor="open-code">{t("open.placeholder")}</label>
          <input
            id="open-code"
            className="input"
            type="text"
            placeholder={t("open.placeholder")}
            value={code}
            onChange={(e) => { setCode(e.target.value); setStep("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleOpen(); }}
            autoComplete="off"
            autoFocus
            spellCheck={false}
          />
          {step === "error" && (
            <p className="hint motion-reveal" role="alert" style={{ color: "var(--de-error)" }}>
              {t("open.error")}
            </p>
          )}
        </div>

        <HandoffQrScanner onCode={(scannedCode) => { setCode(scannedCode); setStep("idle"); }} />

        <button
          className={`btn btn-primary${step === "opening" ? " motion-pop" : ""}`}
          disabled={step === "opening" || code.trim().length === 0}
          onClick={() => void handleOpen()}
        >
          {step === "opening" ? t("open.opening") : t("open.openBtn")}
        </button>

        <MultiLineText text={t("open.safety")} className="safety-label" />
      </div>
    </div>
  );
}
