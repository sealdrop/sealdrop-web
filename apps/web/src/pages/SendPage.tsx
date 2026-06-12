import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CopyButton } from "../components/CopyButton.js";
import {
  generateFileKey,
  generateIV,
  encryptMetadata,
  encryptChunk,
  keyToFragment,
  toBase64Url,
  buildSendLink,
  wrapKeyWithPassphrase,
  buildPassphraseLink,
  generateAccessCode,
  wrapKeyWithAccessCode,
  buildAccessCodeLink,
  padToBlock,
  enhancedPaddedSize,
  maximumPaddedSize,
  padToSize,
  fillRandom,
  encryptHandoffUrl,
} from "@sealdrop/crypto";
import { CHUNK_SIZE_BYTES, DEFAULT_SEND_EXPIRY, MAX_FILE_SIZE_BYTES } from "@sealdrop/shared";
import type { SendExpiryPreset } from "@sealdrop/shared";
import { FilePicker } from "../components/FilePicker.js";
import { ExpirySelector } from "../components/ExpirySelector.js";
import { LinkBox } from "../components/LinkBox.js";
import { QRCode } from "../components/QRCode.js";
import { TurnstileWidget, turnstileEnabled } from "../components/TurnstileWidget.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { MotionIconStack } from "../components/MotionIconStack.js";
import { InstallHint } from "../components/InstallHint.js";
import { sendInit, sendChunk, sendComplete, getChunkStatus, createOpenLink, ApiError } from "../lib/api.js";
import { formatBytes, formatExpiry } from "../lib/format.js";
import { clearSharedTargetPayload, getSharedTargetPayload } from "../lib/share-target.js";

type Step = "idle" | "sealing" | "uploading" | "done" | "error";

export function SendPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState<SendExpiryPreset>(DEFAULT_SEND_EXPIRY);
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [deleteLink, setDeleteLink] = useState("");
  const [shareExpiry, setShareExpiry] = useState("");
  const [shareSize, setShareSize] = useState(0);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [useAccessCode, setUseAccessCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [wantDeleteLink, setWantDeleteLink] = useState(false);
  const [note, setNote] = useState("");
  const [sharedTargetMessage, setSharedTargetMessage] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [paddingLevel, setPaddingLevel] = useState<"standard" | "enhanced" | "maximum">("standard");

  // Open on another device
  type HandoffStep = "idle" | "creating" | "ready" | "error";
  const [handoffStep, setHandoffStep] = useState<HandoffStep>("idle");
  const [handoffCode, setHandoffCode] = useState("");
  const [handoffExpiry, setHandoffExpiry] = useState("");

  useEffect(() => {
    if (location.pathname !== "/send/shared") return;

    let cancelled = false;
    async function loadSharedTarget() {
      const payload = await getSharedTargetPayload().catch(() => undefined);
      await clearSharedTargetPayload().catch(() => {});
      if (cancelled) return;

      if (!payload) {
        setSharedTargetMessage(t("send.shared.empty"));
        return;
      }

      const sharedText = [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
      if (sharedText) setNote(sharedText);

      if (payload.file) {
        if (payload.file.size > MAX_FILE_SIZE_BYTES) {
          setErrorMsg(t("filePicker.tooLarge", { size: formatBytes(MAX_FILE_SIZE_BYTES) }));
          setStep("error");
          setSharedTargetMessage(t("send.shared.tooLarge"));
        } else {
          setFile(payload.file);
          setSharedTargetMessage(t("send.shared.loaded"));
        }
      } else {
        setSharedTargetMessage(t("send.shared.textOnly"));
      }
    }

    void loadSharedTarget();
    return () => { cancelled = true; };
  }, [location.pathname, t]);

  async function handleCreateOpenCode() {
    if (!shareLink) return;
    setHandoffStep("creating");
    try {
      const { handoffId, displayCode, encryptedPayload, payloadIv, kdfSalt, kdfIterations } =
        await encryptHandoffUrl(shareLink);
      await createOpenLink({
        handoff_id: handoffId,
        encrypted_payload: encryptedPayload,
        payload_iv: payloadIv,
        kdf_salt: kdfSalt,
        kdf_iterations: kdfIterations,
      });
      setHandoffCode(displayCode);
      setHandoffExpiry(t("common.openOnDevice.expiryDuration"));
      setHandoffStep("ready");
    } catch {
      setHandoffStep("error");
    }
  }

  async function handleSeal() {
    if (!file) return;
    try {
      setStep("sealing");
      setProgressPct(0);

      const key = await generateFileKey();
      const fileIv = generateIV();
      const metaIv = generateIV();

      const realChunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

      // Compute total chunk count and paddedSizeBytes for Enhanced/Maximum levels.
      let paddedSizeBytes: number | undefined;
      let totalChunkCount: number;

      if (paddingLevel !== "standard") {
        const targetSize = paddingLevel === "enhanced"
          ? enhancedPaddedSize(file.size)
          : maximumPaddedSize(file.size);
        if (targetSize > file.size) {
          paddedSizeBytes = targetSize;
          totalChunkCount = Math.ceil(targetSize / CHUNK_SIZE_BYTES);
        } else {
          // File exceeds all padding buckets; fall back to standard behaviour.
          totalChunkCount = realChunkCount;
        }
      } else {
        totalChunkCount = realChunkCount;
      }

      const encryptedMeta = await encryptMetadata(
        {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          chunkCount: totalChunkCount,
          padded: true,
          ...(paddedSizeBytes !== undefined ? { paddedSizeBytes } : {}),
          ...(note ? { note } : {}),
        },
        key,
        metaIv,
      );

      setStep("uploading");

      const { file_id, expires_at, delete_token } = await sendInit({
        size_bytes: file.size,
        expiry_preset: expiry,
        encrypted_metadata: toBase64Url(encryptedMeta),
        metadata_iv: toBase64Url(metaIv.buffer as ArrayBuffer),
        file_iv: toBase64Url(fileIv.buffer as ArrayBuffer),
        chunk_count: totalChunkCount,
        want_delete_link: wantDeleteLink,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      }) as { file_id: string; expires_at: string; delete_token?: string };

      // Resume: check which chunks are already uploaded
      let uploaded: number[] = [];
      try { uploaded = await getChunkStatus(file_id); } catch { /* assume none */ }
      const uploadedSet = new Set(uploaded);

      for (let i = 0; i < totalChunkCount; i++) {
        if (uploadedSet.has(i)) {
          setProgressPct(Math.round(((i + 1) / totalChunkCount) * 100));
          continue;
        }

        let chunkData: ArrayBuffer;

        if (paddedSizeBytes !== undefined) {
          // Enhanced or Maximum: each chunk is filled to its target size with random padding.
          const thisChunkSize = Math.min(CHUNK_SIZE_BYTES, paddedSizeBytes - i * CHUNK_SIZE_BYTES);
          if (i < realChunkCount) {
            const start = i * CHUNK_SIZE_BYTES;
            const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
            const realData = await file.slice(start, end).arrayBuffer();
            chunkData = padToSize(realData, thisChunkSize);
          } else {
            // Pure random padding chunk — no real file data.
            const buf = new Uint8Array(thisChunkSize);
            fillRandom(buf);
            chunkData = buf.buffer as ArrayBuffer;
          }
        } else {
          // Standard: pad only the last chunk to a 4 KiB boundary.
          const start = i * CHUNK_SIZE_BYTES;
          const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
          chunkData = await file.slice(start, end).arrayBuffer();
          if (i === totalChunkCount - 1) chunkData = padToBlock(chunkData);
        }

        const encrypted = await encryptChunk(chunkData, key, fileIv, i);
        await sendChunk(file_id, i, encrypted);
        setProgressPct(Math.round(((i + 1) / totalChunkCount) * 100));
      }

      await sendComplete(file_id);

      let link: string;
      let code = "";
      if (useAccessCode) {
        code = generateAccessCode();
        const wrapped = await wrapKeyWithAccessCode(key, code);
        link = buildAccessCodeLink(file_id, wrapped.wrappedKey, wrapped.salt, wrapped.iv);
      } else if (passphrase) {
        const wrapped = await wrapKeyWithPassphrase(key, passphrase);
        link = buildPassphraseLink(file_id, wrapped.wrappedKey, wrapped.salt, wrapped.iv);
      } else {
        const keyFragment = await keyToFragment(key);
        link = buildSendLink(file_id, keyFragment);
      }
      setGeneratedCode(code);

      setShareLink(link);
      if (delete_token) {
        const origin = window.location.origin;
        setDeleteLink(`${origin}/s/${file_id}/delete#token=${delete_token}`);
      }
      setShareExpiry(formatExpiry(expires_at, expiry === "open-once" ? 1 : 999));
      setShareSize(file.size);
      setStep("done");
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.code === "too_large" ? t("filePicker.tooLarge", { size: "50 GB" }) : t("drop.uploadFailed")
        : t("receive.errorGeneric");
      setErrorMsg(msg);
      setStep("error");
    }
  }

  if (step === "done") {
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
              <button className="btn btn-secondary" onClick={() => void handleCreateOpenCode()}>
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

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="send" />
        <div className="nav">
          <button className="back" onClick={() => navigate("/")}>{t("common.back")}</button>
        </div>
        <div>
          <h1 className="title">{t("send.title")}</h1>
          <p className="subtitle">{t("send.subtitle")}</p>
        </div>
        <InstallHint />
        {sharedTargetMessage && (
          <div className="info-box motion-reveal" role="status">
            <strong>{t("send.shared.title")}</strong>
            <span>{sharedTargetMessage}</span>
          </div>
        )}

        <FilePicker file={file} onFile={setFile} />
        <ExpirySelector mode="send" value={expiry} onChange={setExpiry} />

        <textarea
          className="input"
          placeholder={t("send.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{ resize: "vertical" }}
        />

        <div className="stack-sm">
          <p className="hint">{t("send.sizePrivacy")}</p>
          {(["standard", "enhanced", "maximum"] as const).map((level) => {
            const label = t(`send.padding.${level}`);
            let desc: string;
            if (!file) {
              desc = t(`send.padding.desc${level.charAt(0).toUpperCase() + level.slice(1)}`);
            } else {
              const target = level === "standard"
                ? file.size
                : level === "enhanced"
                ? enhancedPaddedSize(file.size)
                : maximumPaddedSize(file.size);
              desc = t("send.padding.descFile", { size: formatBytes(target) });
            }
            return (
              <label key={level} className="checkbox-label">
                <input
                  type="radio"
                  name="paddingLevel"
                  value={level}
                  checked={paddingLevel === level}
                  onChange={() => setPaddingLevel(level)}
                />
                <span>{label} — {desc}</span>
              </label>
            );
          })}
        </div>

        <div className="stack-sm">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showPassphraseInput}
              disabled={useAccessCode}
              onChange={(e) => {
                setShowPassphraseInput(e.target.checked);
                if (!e.target.checked) setPassphrase("");
              }}
            />
            <span>{t("send.passphrase.label")}</span>
          </label>
          {showPassphraseInput && (
            <>
              <input
                className="input"
                type="password"
                placeholder={t("send.passphrase.placeholder")}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="off"
              />
              {passphrase.length > 0 && passphrase.length < 8 && (
                <p className="hint" style={{ color: "var(--color-error)" }}>{t("send.passphrase.tooShort")}</p>
              )}
            </>
          )}
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useAccessCode}
            onChange={(e) => {
              setUseAccessCode(e.target.checked);
              if (e.target.checked) {
                setShowPassphraseInput(false);
                setPassphrase("");
              }
            }}
          />
          <span>{t("send.accessCode.label")}</span>
        </label>
        {useAccessCode && (
          <p className="hint">{t("send.accessCode.hint")}</p>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={wantDeleteLink}
            onChange={(e) => setWantDeleteLink(e.target.checked)}
          />
          <span>{t("send.deleteLink")}</span>
        </label>

        {step === "error" && <div className="error-box motion-reveal">{errorMsg}</div>}

        {(step === "sealing" || step === "uploading") ? (
          <div className="stack-sm motion-reveal">
            <ProgressBar
              value={progressPct}
              label={step === "sealing" ? t("send.sealing") : t("send.uploading", { pct: progressPct })}
            />
            <p className="hint" style={{ textAlign: "center" }}>
              {step === "sealing" ? t("send.sealing") : t("send.uploading", { pct: progressPct })}
            </p>
          </div>
        ) : (
          <>
            <TurnstileWidget
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
            <button
              className="btn btn-primary"
              disabled={!file || (turnstileEnabled && !turnstileToken) || (showPassphraseInput && passphrase.length < 8)}
              onClick={() => void handleSeal()}
            >
              {t("send.sealBtn")}
            </button>
          </>
        )}

        <p className="safety-label">
          {t("send.safety").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
