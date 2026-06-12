import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { generateOwnerKeyPair, exportPublicKey, privateKeyToFragment, buildOwnerLink } from "@sealdrop/crypto";
import { DEFAULT_RECEIVE_EXPIRY } from "@sealdrop/shared";
import type { ReceiveExpiryPreset } from "@sealdrop/shared";
import { ExpirySelector } from "../components/ExpirySelector.js";
import { LinkBox } from "../components/LinkBox.js";
import { QRCode } from "../components/QRCode.js";
import { TurnstileWidget, turnstileEnabled } from "../components/TurnstileWidget.js";
import { MotionIconStack } from "../components/MotionIconStack.js";
import { InstallHint } from "../components/InstallHint.js";
import { receiveInit, ApiError } from "../lib/api.js";

type Step = "idle" | "creating" | "done" | "error";

export function ReceivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expiry, setExpiry] = useState<ReceiveExpiryPreset>(DEFAULT_RECEIVE_EXPIRY);
  const [step, setStep] = useState<Step>("idle");
  const [dropLink, setDropLink] = useState("");
  const [ownerLink, setOwnerLink] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleCreate() {
    try {
      setStep("creating");

      const keyPair = await generateOwnerKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKeyFragment = await privateKeyToFragment(keyPair.privateKey);

      const { drop_id } = await receiveInit({
        public_key: publicKey,
        expiry_preset: expiry,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      });

      setDropLink(`${window.location.origin}/r/${drop_id}`);
      setOwnerLink(buildOwnerLink(drop_id, privateKeyFragment));
      setStep("done");
    } catch (err) {
      const msg = err instanceof ApiError ? t("receive.errorServer") : t("receive.errorGeneric");
      setErrorMsg(msg);
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="receive" />
          <div className="nav">
            <button className="back" onClick={() => navigate("/")}>{t("common.back")}</button>
          </div>
          <div>
            <h1 className="title">{t("receive.done.title")}</h1>
            <p className="subtitle">{t("receive.done.subtitle")}</p>
          </div>

          <LinkBox label={t("receive.done.dropLabel")} url={dropLink} />
          <QRCode url={dropLink} />

          <hr className="divider" />

          <div className="warning">
            <strong>{t("receive.done.warning")}</strong>
          </div>
          <LinkBox label={t("receive.done.ownerLabel")} url={ownerLink} warning={t("receive.done.ownerLinkWarning")} />

          <hr className="divider" />
          <p className="safety-label">
            {t("receive.done.safety").split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : null}</span>
            ))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="receive" />
        <div className="nav">
          <button className="back" onClick={() => navigate("/")}>{t("common.back")}</button>
        </div>
        <div>
          <h1 className="title">{t("receive.title")}</h1>
          <p className="subtitle">{t("receive.subtitle")}</p>
        </div>
        <InstallHint />

        <ExpirySelector mode="receive" value={expiry} onChange={setExpiry} />

        {step === "error" && <div className="error-box motion-reveal">{errorMsg}</div>}

        {step === "creating" ? (
          <div className="stack-sm motion-reveal">
            <div className="progress"><div className="progress__bar" style={{ width: "60%" }} /></div>
            <p className="hint" style={{ textAlign: "center" }}>{t("receive.creating")}</p>
          </div>
        ) : (
          <>
            <TurnstileWidget
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
            <button
              className="btn btn-primary"
              disabled={turnstileEnabled && !turnstileToken}
              onClick={() => void handleCreate()}
            >
              {t("receive.createBtn")}
            </button>
          </>
        )}

        <p className="safety-label">{t("receive.safety")}</p>
      </div>
    </div>
  );
}
