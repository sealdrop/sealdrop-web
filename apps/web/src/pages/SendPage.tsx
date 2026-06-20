import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  generateFileKey,
  generateIV,
  encryptMetadata,
  keyToFragment,
  fragmentToKey,
  toBase64Url,
  fromBase64Url,
  buildSendLink,
  wrapKeyWithPassphrase,
  buildPassphraseLink,
  generateAccessCode,
  wrapKeyWithAccessCode,
  buildAccessCodeLink,
  enhancedPaddedSize,
  maximumPaddedSize,
  encryptHandoffUrl,
  formatHandoffCode,
  createChainedHasher,
} from "@sealdrop/crypto";
import { CHUNK_SIZE_BYTES, DEFAULT_SEND_EXPIRY, MAX_FILE_SIZE_BYTES } from "@sealdrop/shared";
import type { SendExpiryPreset } from "@sealdrop/shared";
import { FilePicker } from "../components/FilePicker.js";
import { ExpirySelector } from "../components/ExpirySelector.js";
import { TurnstileWidget, turnstileEnabled } from "../components/TurnstileWidget.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { EncryptionGrid } from "../components/EncryptionGrid.js";
import { InstallHint } from "../components/InstallHint.js";
import { SendDoneView } from "../components/SendDoneView.js";
import { MultiLineText } from "../components/MultiLineText.js";
import { sendInit, uploadSendPart, sendComplete, getSendUploadStatus, retryWithBackoff, createOpenLink, ApiError } from "../lib/api.js";
import { saveUploadSession, loadUploadSession, clearUploadSession, type UploadSession } from "../lib/uploadSession.js";
import { formatBytes, formatExpiry } from "../lib/format.js";
import { usePageTitle } from "../lib/use-page-title.js";
import { clearSharedTargetPayload, getSharedTargetPayload } from "../lib/share-target.js";
import { createEncryptedUploadPartBlob, TRANSPORT_CHUNKS_PER_PART } from "../lib/encrypted-upload-stream.js";

type Step = "idle" | "sealing" | "uploading" | "done" | "error";

export function SendPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle(t("common.pageTitle.send"));
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
  const [resumeSession, setResumeSession] = useState<UploadSession | null>(null);
  const [isResuming, setIsResuming] = useState(false);

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

  // Load any interrupted upload session saved before a page reload.
  useEffect(() => {
    setResumeSession(loadUploadSession());
  }, []);

  // Detect when the selected file matches an interrupted session.
  useEffect(() => {
    if (resumeSession && file && file.name === resumeSession.filename && file.size === resumeSession.size_bytes) {
      setIsResuming(true);
    } else {
      setIsResuming(false);
    }
  }, [file, resumeSession]);

  const dismissResume = useCallback(() => {
    clearUploadSession();
    setResumeSession(null);
    setIsResuming(false);
  }, []);

  const handleCreateOpenCode = useCallback(async () => {
    if (!shareLink) return;
    setHandoffStep("creating");
    try {
      const { secret, encryptedPayload, payloadIv, kdfSalt, kdfIterations } =
        await encryptHandoffUrl(shareLink);
      const { handoff_id } = await createOpenLink({
        encrypted_payload: encryptedPayload,
        payload_iv: payloadIv,
        kdf_salt: kdfSalt,
        kdf_iterations: kdfIterations,
      });
      setHandoffCode(formatHandoffCode(handoff_id, secret));
      setHandoffExpiry(t("common.openOnDevice.expiryDuration"));
      setHandoffStep("ready");
    } catch {
      setHandoffStep("error");
    }
  }, [shareLink, t]);

  const handleSeal = useCallback(async () => {
    if (!file) return;
    try {
      setStep("sealing");
      setProgressPct(0);

      let key: CryptoKey;
      let fileIv: Uint8Array<ArrayBuffer>;
      let totalChunkCount: number;
      let paddedSizeBytes: number | undefined;
      let file_id: string;
      let expires_at: string;
      let delete_token: string | undefined;
      let effectivePassphrase: string;
      let effectiveUseAccessCode: boolean;
      let effectiveWantDeleteLink: boolean;
      let effectiveExpiry: SendExpiryPreset;

      if (isResuming && resumeSession) {
        // ── Resume path: restore key and metadata from the saved session ──────
        const session = resumeSession;
        key = await fragmentToKey(session.key_b64);
        fileIv = new Uint8Array(fromBase64Url(session.file_iv)) as Uint8Array<ArrayBuffer>;
        totalChunkCount = session.chunk_count;
        paddedSizeBytes = session.padded_size_bytes;
        file_id = session.file_id;
        expires_at = session.expires_at;
        delete_token = session.delete_token;
        effectivePassphrase = session.passphrase ?? "";
        effectiveUseAccessCode = session.use_access_code ?? false;
        effectiveWantDeleteLink = session.want_delete_link ?? false;
        effectiveExpiry = session.expiry_preset as SendExpiryPreset;
        setStep("uploading");
      } else {
        // ── Fresh path: seal the file and call sendInit ────────────────────
        key = await generateFileKey();
        fileIv = generateIV();
        const metaIv = generateIV();

        const realChunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

        if (paddingLevel !== "standard") {
          const targetSize = paddingLevel === "enhanced"
            ? enhancedPaddedSize(file.size)
            : maximumPaddedSize(file.size);
          if (targetSize > file.size) {
            paddedSizeBytes = targetSize;
            totalChunkCount = Math.ceil(targetSize / CHUNK_SIZE_BYTES);
          } else {
            totalChunkCount = realChunkCount;
          }
        } else {
          totalChunkCount = realChunkCount;
        }

        const hasher = createChainedHasher();
        for (let i = 0; i < realChunkCount; i++) {
          const start = i * CHUNK_SIZE_BYTES;
          const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
          await hasher.update(await file.slice(start, end).arrayBuffer());
          setProgressPct(Math.round(((i + 1) / realChunkCount) * 100));
        }
        const sha256 = toBase64Url(hasher.digest()!);
        setProgressPct(0);

        const encryptedMeta = await encryptMetadata(
          {
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            storageFormat: "stream-v1",
            chunkSizeBytes: CHUNK_SIZE_BYTES,
            chunkCount: totalChunkCount,
            padded: true,
            sha256,
            ...(paddedSizeBytes !== undefined ? { paddedSizeBytes } : {}),
            ...(note ? { note } : {}),
          },
          key,
          metaIv,
        );

        setStep("uploading");

        const result = await sendInit({
          size_bytes: file.size,
          expiry_preset: expiry,
          encrypted_metadata: toBase64Url(encryptedMeta),
          metadata_iv: toBase64Url(metaIv.buffer as ArrayBuffer),
          file_iv: toBase64Url(fileIv.buffer as ArrayBuffer),
          chunk_count: totalChunkCount,
          want_delete_link: wantDeleteLink,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        }) as { file_id: string; expires_at: string; delete_token?: string };

        file_id = result.file_id;
        expires_at = result.expires_at;
        delete_token = result.delete_token;
        effectivePassphrase = passphrase;
        effectiveUseAccessCode = useAccessCode;
        effectiveWantDeleteLink = wantDeleteLink;
        effectiveExpiry = expiry;

        // Persist session so a page reload can resume from the last landed part.
        saveUploadSession({
          file_id,
          key_b64: await keyToFragment(key),
          file_iv: toBase64Url(fileIv.buffer as ArrayBuffer),
          chunk_count: totalChunkCount,
          ...(paddedSizeBytes !== undefined ? { padded_size_bytes: paddedSizeBytes } : {}),
          filename: file.name,
          size_bytes: file.size,
          expires_at,
          ...(delete_token ? { delete_token } : {}),
          expiry_preset: expiry,
          ...(passphrase ? { passphrase } : {}),
          ...(useAccessCode ? { use_access_code: true } : {}),
          ...(wantDeleteLink ? { want_delete_link: true } : {}),
        });
      }

      const partCount = Math.ceil(totalChunkCount / TRANSPORT_CHUNKS_PER_PART);

      // Query which parts already landed (covers both in-session retries and cross-reload resume).
      let alreadyUploadedParts: number[] = [];
      try {
        const status = await getSendUploadStatus(file_id);
        alreadyUploadedParts = status.uploaded_parts;
      } catch {
        if (isResuming) {
          // Server no longer has this file — it expired while we were away.
          clearUploadSession();
          setResumeSession(null);
          setIsResuming(false);
          throw Object.assign(new Error("upload_expired"), { _sealdrop: true });
        }
        // Fresh path: server just created the file, proceed from part 0.
      }

      const alreadyDoneChunks = alreadyUploadedParts.length * TRANSPORT_CHUNKS_PER_PART;
      setProgressPct(Math.round((alreadyDoneChunks / totalChunkCount) * 100));

      for (let partIndex = 0; partIndex < partCount; partIndex++) {
        if (alreadyUploadedParts.includes(partIndex)) continue;

        const startChunkIndex = partIndex * TRANSPORT_CHUNKS_PER_PART;
        const endChunkIndex = Math.min(startChunkIndex + TRANSPORT_CHUNKS_PER_PART, totalChunkCount);
        const encryptedPart = await createEncryptedUploadPartBlob({
          file,
          key,
          fileIv,
          chunkCount: totalChunkCount,
          startChunkIndex,
          endChunkIndex,
          ...(paddedSizeBytes !== undefined ? { paddedSizeBytes } : {}),
          onProgress: (uploadedChunks) => {
            setProgressPct(Math.round((uploadedChunks / totalChunkCount) * 100));
          },
        });
        await retryWithBackoff(() => uploadSendPart(file_id, partIndex, encryptedPart));
      }

      await sendComplete(file_id);
      clearUploadSession();
      setResumeSession(null);
      setIsResuming(false);

      let link: string;
      let code = "";
      if (effectiveUseAccessCode) {
        code = generateAccessCode();
        const wrapped = await wrapKeyWithAccessCode(key, code);
        link = buildAccessCodeLink(file_id, wrapped.wrappedKey, wrapped.salt, wrapped.iv);
      } else if (effectivePassphrase) {
        const wrapped = await wrapKeyWithPassphrase(key, effectivePassphrase);
        link = buildPassphraseLink(file_id, wrapped.wrappedKey, wrapped.salt, wrapped.iv);
      } else {
        const keyFragment = await keyToFragment(key);
        link = buildSendLink(file_id, keyFragment);
      }
      setGeneratedCode(code);

      setShareLink(link);
      if (effectiveWantDeleteLink && delete_token) {
        const origin = window.location.origin;
        setDeleteLink(`${origin}/s/${file_id}/delete#token=${delete_token}`);
      }
      setShareExpiry(formatExpiry(expires_at, effectiveExpiry === "open-once" ? 1 : 999, t));
      setShareSize(file.size);
      setStep("done");
    } catch (err) {
      if (isResuming) {
        clearUploadSession();
        setResumeSession(null);
        setIsResuming(false);
      }
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.code === "too_large" ? t("filePicker.tooLarge", { size: "200 GB" }) : t("drop.uploadFailed");
      } else if (err instanceof Error && err.message === "upload_expired") {
        msg = t("send.resume.expiredError");
      } else {
        msg = t("receive.errorGeneric");
      }
      setErrorMsg(msg);
      setStep("error");
    }
  }, [file, expiry, paddingLevel, passphrase, useAccessCode, wantDeleteLink, note, turnstileToken, t, navigate, isResuming, resumeSession]);

  if (step === "done") {
    return (
      <SendDoneView
        shareLink={shareLink}
        deleteLink={deleteLink}
        shareExpiry={shareExpiry}
        shareSize={shareSize}
        generatedCode={generatedCode}
        passphrase={passphrase}
        handoffStep={handoffStep}
        handoffCode={handoffCode}
        handoffExpiry={handoffExpiry}
        onCreateOpenCode={() => void handleCreateOpenCode()}
      />
    );
  }

  return (
    <div className="page">
      <div className="card send-card">
        <div className="send-layout">

          {/* ── Left column: identity + file ── */}
          <div className="send-col">
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
            {resumeSession && step === "idle" && (
              <div className="info-box motion-reveal" role="status">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span>
                    <strong>{t("send.resume.bannerTitle")}</strong>{" "}
                    {t("send.resume.bannerBody", { filename: resumeSession.filename })}
                  </span>
                  <button className="back" style={{ flexShrink: 0 }} onClick={dismissResume}>
                    {t("send.resume.dismiss")}
                  </button>
                </div>
              </div>
            )}
            <FilePicker file={file} onFile={setFile} />
          </div>

          {/* ── Right column: options + action ── */}
          <div className="send-col">
            {step === "idle" && (
              <>
                <ExpirySelector mode="send" value={expiry} onChange={setExpiry} />

                {/* a11y: 3.3.2 - associate textarea with a label (visually hidden, placeholder remains visible) */}
                <label className="sr-only" htmlFor="send-note">{t("send.notePlaceholder")}</label>
                <textarea
                  id="send-note"
                  className="input"
                  placeholder={t("send.notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical" }}
                />

                <div className="stack-sm">
                  <p className="hint" id="send-padding-label">{t("send.sizePrivacy")}</p>
                  <div role="radiogroup" aria-labelledby="send-padding-label" className="seg-control">
                    {(["standard", "enhanced", "maximum"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={paddingLevel === level}
                        className={`seg-btn${paddingLevel === level ? " seg-btn--active" : ""}`}
                        onClick={() => setPaddingLevel(level)}
                      >
                        {t(`send.padding.${level}`)}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const level = paddingLevel;
                    let desc: string;
                    if (!file) {
                      desc = t(`send.padding.desc${level.charAt(0).toUpperCase() + level.slice(1)}`);
                    } else {
                      const target =
                        level === "standard" ? file.size
                        : level === "enhanced" ? enhancedPaddedSize(file.size)
                        : maximumPaddedSize(file.size);
                      desc = t("send.padding.descFile", { size: formatBytes(target) });
                    }
                    return <p key={level} className="hint seg-desc">{desc}</p>;
                  })()}
                </div>

                <div className="stack-sm">
                  <label className={`toggle-label${useAccessCode ? " toggle-label--disabled" : ""}`}>
                    <span className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showPassphraseInput}
                        disabled={useAccessCode}
                        onChange={(e) => {
                          setShowPassphraseInput(e.target.checked);
                          if (!e.target.checked) setPassphrase("");
                        }}
                      />
                      <span aria-hidden="true" />
                    </span>
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
                        <p className="hint" style={{ color: "var(--de-error)" }}>{t("send.passphrase.tooShort")}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="stack-sm">
                  <label className="toggle-label">
                    <span className="toggle-switch">
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
                      <span aria-hidden="true" />
                    </span>
                    <span>{t("send.accessCode.label")}</span>
                  </label>
                  {useAccessCode && (
                    <p className="hint">{t("send.accessCode.hint")}</p>
                  )}
                </div>

                <label className="toggle-label">
                  <span className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={wantDeleteLink}
                      onChange={(e) => setWantDeleteLink(e.target.checked)}
                    />
                    <span aria-hidden="true" />
                  </span>
                  <span>{t("send.deleteLink")}</span>
                </label>
              </>
            )}

            {step === "error" && <div className="error-box motion-reveal" role="alert">{errorMsg}</div>}

            {(step === "sealing" || step === "uploading") ? (
              <div className="stack-sm motion-reveal">
                {step === "sealing" ? (
                  <>
                    <EncryptionGrid progress={progressPct} />
                    <p className="hint" style={{ textAlign: "center" }}>
                      {t("send.hashing", { pct: progressPct })}
                    </p>
                  </>
                ) : (
                  <>
                    <ProgressBar
                      value={progressPct}
                      label={t("send.uploading", { pct: progressPct })}
                    />
                    <p className="hint" style={{ textAlign: "center" }}>
                      {t("send.uploading", { pct: progressPct })}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {!isResuming && (
                  <TurnstileWidget
                    onToken={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                  />
                )}
                <button
                  className="btn btn-primary"
                  disabled={
                    !file ||
                    (!isResuming && turnstileEnabled && !turnstileToken) ||
                    (!isResuming && showPassphraseInput && passphrase.length < 8)
                  }
                  onClick={() => void handleSeal()}
                >
                  {isResuming ? t("send.resume.resumeBtn") : t("send.sealBtn")}
                </button>
              </>
            )}

            <MultiLineText text={t("send.safety")} className="safety-label" />
          </div>

        </div>
      </div>
    </div>
  );
}
