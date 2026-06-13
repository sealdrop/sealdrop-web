import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CopyButton } from "./CopyButton.js";
import { LinkBox } from "./LinkBox.js";
import { QRCode } from "./QRCode.js";
import { MotionIconStack } from "./MotionIconStack.js";
import { formatBytes } from "../lib/format.js";

interface SendDoneViewProps {
  shareLink: string;
  deleteLink: string;
  shareExpiry: string;
  shareSize: number;
  generatedCode: string;
  passphrase: string;
  handoffStep: "idle" | "creating" | "ready" | "error";
  handoffCode: string;
  handoffExpiry: string;
  onCreateOpenCode: () => void;
}

export function SendDoneView({
  shareLink,
  deleteLink,
  shareExpiry,
  shareSize,
  generatedCode,
  passphrase,
  handoffStep,
  handoffCode,
  handoffExpiry,
  onCreateOpenCode,
}: SendDoneViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="send" />
        <div className="nav">
          <button className="back" onClick={() => navigate("/")}>{t("common.back")}</button>
        </div>
        <div className="success-icon">✅</div>
        <div className="stack-sm" style={{ textAlign: "center" }}>
          <h1 className="title">{t("send.done.title")}</h1>
          <div className="chip-row" style={{ justifyContent: "center" }}>
            <span className="chip">{formatBytes(shareSize)}</span>
            <span className="chip">{shareExpiry}</span>
          </div>
        </div>
        <LinkBox label={t("send.done.shareLink")} url={shareLink} warning={t("send.done.shareLinkWarning")} />
        {generatedCode && (
          <>
            <LinkBox label={t("send.done.accessCode")} url={generatedCode} warning={t("send.done.accessCodeWarning")} />
            <p className="hint" style={{ textAlign: "center" }}>
              {t("send.done.accessCodeHint")}
            </p>
          </>
        )}
        {deleteLink && <LinkBox label={t("send.done.deleteLink")} url={deleteLink} warning={t("send.done.deleteLinkWarning")} />}
        <QRCode url={shareLink} />
        <hr className="divider" />

        <div className="stack-sm">
          <p className="label">{t("common.openOnDevice.title")}</p>
          <p className="hint">{t("common.openOnDevice.sendHint")}</p>
          {handoffStep === "idle" && (
            <button className="btn btn-secondary" onClick={() => void onCreateOpenCode()}>
              {t("common.openOnDevice.createCode")}
            </button>
          )}
          {handoffStep === "creating" && (
            <button className="btn btn-secondary" disabled>{t("common.openOnDevice.creating")}</button>
          )}
          {handoffStep === "error" && (
            <p className="hint motion-reveal" style={{ color: "var(--color-error)" }}>
              {t("common.openOnDevice.error")}
            </p>
          )}
          {handoffStep === "ready" && (
            <div className="stack-sm motion-reveal">
              <ol className="hint" style={{ paddingLeft: "1.25rem", margin: 0 }}>
                <li>{t("common.openOnDevice.step1")} <strong>sealdrop.io/open</strong></li>
                <li>{t("common.openOnDevice.step2")}</li>
              </ol>
              <div className="link-box handoff-code">
                <span className="link-box__url" style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                  {handoffCode}
                </span>
                <CopyButton text={handoffCode} />
              </div>
              <p className="hint">{t("common.openOnDevice.expires")}</p>
              <CopyButton
                className="btn btn-secondary"
                text={t("common.openOnDevice.instructionsText", { code: handoffCode, expiry: handoffExpiry })}
                label={t("common.openOnDevice.copyInstructions")}
              />
              <p className="hint" style={{ color: "var(--color-muted, #888)" }}>
                {t("common.openOnDevice.securityNote")}
              </p>
            </div>
          )}
        </div>

        <hr className="divider" />
        <p className="safety-label">
          {t("send.done.safetyBase")}<br />
          {generatedCode
            ? t("send.done.safetyCode")
            : passphrase
              ? t("send.done.safetyPassphrase")
              : t("send.done.safetyDefault")}
        </p>
      </div>
    </div>
  );
}
