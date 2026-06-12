import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  parseSendFragment,
  parsePassphraseFragment,
  parseAccessCodeFragment,
  fragmentToKey,
  unwrapKeyWithPassphrase,
  unwrapKeyWithAccessCode,
  fromBase64Url,
  decryptStream,
  decryptMetadata,
  paddedLength,
  CHUNK_SIZE_BYTES,
  encryptHandoffUrl,
} from "@sealdrop/crypto";
import type { FileMetadata } from "@sealdrop/crypto";
import { getSendMetadata, getSendChunk, openSendFile, createOpenLink, ApiError } from "../lib/api.js";
import { CopyButton } from "../components/CopyButton.js";
import { MotionIconStack } from "../components/MotionIconStack.js";
import { formatBytes, formatExpiry, downloadStream, needsLargeDownloadWarning } from "../lib/format.js";

type HandoffStep = "idle" | "creating" | "ready" | "error";

function OpenOnDeviceSection({
  handoffStep,
  handoffCode,
  onCreate,
}: {
  handoffStep: HandoffStep;
  handoffCode: string;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="stack-sm">
      <p className="label">{t("common.openOnDevice.title")}</p>
      {handoffStep === "idle" && (
        <>
          <p className="hint">{t("common.openOnDevice.fileHint")}</p>
          <button className="btn btn-secondary" onClick={onCreate}>
            {t("common.openOnDevice.createCode")}
          </button>
        </>
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
            <li>{t("common.openOnDevice.step1Computer")} <strong>sealdrop.io/open</strong> {t("common.openOnDevice.onYourComputer")}</li>
            <li>{t("common.openOnDevice.step2")}</li>
          </ol>
          <div className="link-box handoff-code">
            <span className="link-box__url" style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
              {handoffCode}
            </span>
            <CopyButton text={handoffCode} />
          </div>
          <p className="hint">{t("common.openOnDevice.expires")}</p>
        </div>
      )}
    </div>
  );
}

function computePaddedTotalLength(sizeBytes: number, chunkCount: number): number {
  if (chunkCount === 0) return 0;
  const lastChunkOrigSize = sizeBytes - (chunkCount - 1) * CHUNK_SIZE_BYTES;
  return (chunkCount - 1) * CHUNK_SIZE_BYTES + paddedLength(lastChunkOrigSize);
}

type Step = "loading" | "passphrase" | "access-code" | "open-once-confirm" | "ready" | "downloading" | "done" | "error";

export function SendFilePage() {
  const { t } = useTranslation();
  const { fileId } = useParams<{ fileId: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [meta, setMeta] = useState<FileMetadata | null>(null);
  const [expiryLabel, setExpiryLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [keyFragment, setKeyFragment] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [passphraseData, setPassphraseData] = useState<{ wrappedKey: string; salt: Uint8Array; iv: Uint8Array } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [accessCodeData, setAccessCodeData] = useState<{ wrappedKey: string; salt: Uint8Array; iv: Uint8Array } | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [isOpenOnce, setIsOpenOnce] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const [handoffStep, setHandoffStep] = useState<HandoffStep>("idle");
  const [handoffCode, setHandoffCode] = useState("");

  async function handleCreateOpenCode() {
    setHandoffStep("creating");
    try {
      const fullUrl = window.location.href;
      const { handoffId, displayCode, encryptedPayload, payloadIv, kdfSalt, kdfIterations } =
        await encryptHandoffUrl(fullUrl);
      await createOpenLink({
        handoff_id: handoffId,
        encrypted_payload: encryptedPayload,
        payload_iv: payloadIv,
        kdf_salt: kdfSalt,
        kdf_iterations: kdfIterations,
      });
      setHandoffCode(displayCode);
      setHandoffStep("ready");
    } catch {
      setHandoffStep("error");
    }
  }

  useEffect(() => {
    const hash = window.location.hash;

    // Access-code links take priority (they also match the 3-part passphrase pattern)
    const acData = parseAccessCodeFragment(hash);
    if (acData) {
      setAccessCodeData(acData);
      setStep("access-code");
      return;
    }

    const ppData = parsePassphraseFragment(hash);
    if (ppData) {
      setPassphraseData(ppData);
      setStep("passphrase");
      return;
    }

    const fragment = parseSendFragment(hash);
    if (!fragment) {
      setErrorMsg(t("sendFile.error.missingKey"));
      setStep("error");
      return;
    }
    setKeyFragment(fragment);

    void loadMetadata(fragment);
  }, [fileId]);

  async function loadMetadata(fragment: string) {
    try {
      if (!fileId) throw new Error("no file id");
      const apiMeta = await getSendMetadata(fileId);
      const key = await fragmentToKey(fragment);
      const iv = new Uint8Array(fromBase64Url(apiMeta.metadata_iv)) as Uint8Array<ArrayBuffer>;
      const encMeta = fromBase64Url(apiMeta.encrypted_metadata);
      const decrypted = await decryptMetadata(encMeta, key, iv);
      setMeta(decrypted);
      setExpiryLabel(formatExpiry(apiMeta.expires_at, apiMeta.remaining_downloads));
      setChunkCount(decrypted.chunkCount ?? apiMeta.chunk_count ?? 1);
      const openOnce = apiMeta.remaining_downloads === 1;
      setIsOpenOnce(openOnce);
      setStep(openOnce ? "open-once-confirm" : "ready");
    } catch (err) {
      if (err instanceof ApiError && (err.code === "not_found" || err.code === "gone")) {
        setErrorMsg(t("sendFile.error.expired"));
      } else {
        setErrorMsg(t("sendFile.error.generic"));
      }
      setStep("error");
    }
  }

  async function handlePassphraseSubmit() {
    if (!passphraseData || !passphrase) return;
    try {
      const key = await unwrapKeyWithPassphrase(
        passphraseData.wrappedKey,
        passphrase,
        passphraseData.salt,
        passphraseData.iv,
      );
      const fragment = await crypto.subtle.exportKey("raw", key).then((raw) => {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        return b64;
      });
      setKeyFragment(fragment);
      setPassphraseError("");
      await loadMetadata(fragment);
    } catch {
      setPassphraseError(t("sendFile.passphrase.error"));
    }
  }

  async function handleAccessCodeSubmit() {
    if (!accessCodeData || !accessCode) return;
    try {
      const key = await unwrapKeyWithAccessCode(
        accessCodeData.wrappedKey,
        accessCode,
        accessCodeData.salt,
        accessCodeData.iv,
      );
      const fragment = await crypto.subtle.exportKey("raw", key).then((raw) => {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        return b64;
      });
      setKeyFragment(fragment);
      setAccessCodeError("");
      await loadMetadata(fragment);
    } catch {
      setAccessCodeError(t("sendFile.accessCode.error"));
    }
  }

  async function handleContinueOpenOnce() {
    if (!fileId) return;
    try {
      await openSendFile(fileId);
      await handleOpen();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "gone" || err.code === "not_found")) {
        setErrorMsg(t("sendFile.error.expiredOpen"));
      } else {
        setErrorMsg(t("sendFile.error.downloadFailed"));
      }
      setStep("error");
    }
  }

  async function handleOpen() {
    if (!fileId || !meta || !keyFragment) return;
    try {
      setStep("downloading");
      setProgressPct(0);
      const serverMeta = await getSendMetadata(fileId);
      const key = await fragmentToKey(keyFragment);
      const fileIv = new Uint8Array(fromBase64Url(serverMeta.file_iv)) as Uint8Array<ArrayBuffer>;
      const count = meta.chunkCount ?? chunkCount;

      // paddedSizeBytes is stored for Enhanced/Maximum; fall back to computed value for Standard.
      const decryptLength = meta.paddedSizeBytes
        ?? (meta.padded
          ? computePaddedTotalLength(meta.sizeBytes, count)
          : meta.sizeBytes);

      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < count; i++) {
            const encChunk = await getSendChunk(fileId, i);
            controller.enqueue(new Uint8Array(encChunk));
            setProgressPct(Math.round(((i + 1) / count) * 70));
          }
          controller.close();
        },
      });

      const decrypted = decryptStream(stream, key, fileIv, decryptLength, (bytesDecrypted) => {
        const pct = 70 + Math.round((bytesDecrypted / decryptLength) * 30);
        setProgressPct(Math.min(pct, 99));
      });

      await downloadStream(meta.filename, decrypted, {
        ...(meta.padded ? { maxBytes: meta.sizeBytes } : {}),
        totalBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
      });

      setProgressPct(100);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && (err.code === "not_found" || err.code === "gone")) {
        setErrorMsg(t("sendFile.error.expiredOpen"));
      } else {
        setErrorMsg(t("sendFile.error.downloadFailed"));
      }
      setStep("error");
    }
  }

  if (step === "loading") {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="subtitle">{t("sendFile.loading")}</p>
        </div>
      </div>
    );
  }

  if (step === "passphrase") {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="file" />
          <div className="success-icon">🔒</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("sendFile.passphrase.title")}</h1>
          <p className="subtitle" style={{ textAlign: "center" }}>{t("sendFile.passphrase.subtitle")}</p>
          <div className="stack-sm">
            <input
              className="input"
              type="password"
              placeholder={t("sendFile.passphrase.placeholder")}
              value={passphrase}
              onChange={(e) => { setPassphrase(e.target.value); setPassphraseError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handlePassphraseSubmit(); }}
              autoFocus
              autoComplete="off"
            />
            {passphraseError && <p className="hint motion-reveal" style={{ color: "var(--color-error)" }}>{passphraseError}</p>}
            <button className="btn btn-primary" disabled={!passphrase} onClick={() => void handlePassphraseSubmit()}>
              {t("sendFile.passphrase.unlock")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "access-code") {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="file" />
          <div className="success-icon">🔑</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("sendFile.accessCode.title")}</h1>
          <p className="subtitle" style={{ textAlign: "center" }}>{t("sendFile.accessCode.subtitle")}</p>
          <div className="stack-sm">
            <input
              className="input"
              type="text"
              placeholder={t("sendFile.accessCode.placeholder")}
              value={accessCode}
              onChange={(e) => { setAccessCode(e.target.value); setAccessCodeError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAccessCodeSubmit(); }}
              autoFocus
              autoComplete="off"
              style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
            />
            {accessCodeError && <p className="hint motion-reveal" style={{ color: "var(--color-error)" }}>{accessCodeError}</p>}
            <button className="btn btn-primary" disabled={!accessCode} onClick={() => void handleAccessCodeSubmit()}>
              {t("sendFile.passphrase.unlock")}
            </button>
          </div>
          <p className="safety-label">
            {t("sendFile.accessCode.safety").split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : null}</span>
            ))}
          </p>
        </div>
      </div>
    );
  }

  if (step === "open-once-confirm") {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="file" />
          <div className="success-icon">⚠️</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("sendFile.openOnce.title")}</h1>
          <p className="subtitle" style={{ textAlign: "center" }}>{t("sendFile.openOnce.subtitle")}</p>
          {meta && (
            <div className="chip-row" style={{ justifyContent: "center" }}>
              <span className="chip">{meta.filename}</span>
              <span className="chip">{formatBytes(meta.sizeBytes)}</span>
            </div>
          )}
          {meta?.note && (
            <div className="note-box">
              <p className="note-box__label">{t("sendFile.openOnce.senderNote")}</p>
              <p className="note-box__text">{meta.note}</p>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => void handleContinueOpenOnce()}>
            {t("sendFile.openOnce.btn")}
          </button>
          <p className="safety-label">{t("sendFile.openOnce.safety")}</p>
          <hr className="divider" />
          <OpenOnDeviceSection
            handoffStep={handoffStep}
            handoffCode={handoffCode}
            onCreate={() => void handleCreateOpenCode()}
          />
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="file" />
          <div className="success-icon">🔒</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("sendFile.error.title")}</h1>
          <div className="error-box motion-reveal">{errorMsg}</div>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="card stack" style={{ textAlign: "center" }}>
          <MotionIconStack variant="file" />
          <div className="success-icon">✅</div>
          <h1 className="title">{t("sendFile.done.title")}</h1>
          <p className="subtitle">{t("sendFile.done.subtitle")}</p>
          <p className="safety-label">{t("sendFile.done.safety")}</p>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="file" />
        <div className="success-icon">📨</div>
        <div style={{ textAlign: "center" }}>
          <h1 className="title">{t("sendFile.ready.title")}</h1>
          <p className="subtitle">{t("sendFile.ready.subtitle")}</p>
        </div>
        {meta && (
          <div className="chip-row" style={{ justifyContent: "center" }}>
            <span className="chip">{meta.filename}</span>
            <span className="chip">{formatBytes(meta.sizeBytes)}</span>
            <span className="chip">{expiryLabel}</span>
          </div>
        )}
        {meta && needsLargeDownloadWarning(meta.sizeBytes) && (
          <p className="hint" style={{ textAlign: "center" }}>{t("common.largeDownloadWarning")}</p>
        )}
        {meta?.note && (
          <div className="note-box">
            <p className="note-box__label">{t("sendFile.openOnce.senderNote")}</p>
            <p className="note-box__text">{meta.note}</p>
          </div>
        )}
        {step === "downloading" ? (
          <div className="stack-sm motion-reveal">
            <div className="progress"><div className="progress__bar" style={{ width: `${progressPct}%` }} /></div>
            <p className="hint" style={{ textAlign: "center" }}>{t("sendFile.ready.downloading", { pct: progressPct })}</p>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => void handleOpen()}>
            {t("sendFile.ready.openBtn")}
          </button>
        )}
        <p className="safety-label">
          {t("sendFile.ready.safety").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </p>
        <hr className="divider" />
        <OpenOnDeviceSection
          handoffStep={handoffStep}
          handoffCode={handoffCode}
          onCreate={() => void handleCreateOpenCode()}
        />
      </div>
    </div>
  );
}
