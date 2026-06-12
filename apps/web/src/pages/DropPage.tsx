import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  importPublicKey,
  generateFileKey,
  generateIV,
  encryptChunk,
  encryptMetadata,
  wrapFileKey,
  toBase64Url,
  padToBlock,
} from "@sealdrop/crypto";
import { CHUNK_SIZE_BYTES } from "@sealdrop/shared";
import { FilePicker } from "../components/FilePicker.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { MotionIconStack } from "../components/MotionIconStack.js";
import { getReceiveSession, receiveFileInit, receiveChunk, receiveComplete, ApiError } from "../lib/api.js";
import { formatExpiry } from "../lib/format.js";
import type { ReceiveSessionResponse } from "@sealdrop/shared";

type Step = "loading" | "ready" | "sealing" | "uploading" | "done" | "error" | "closed";

export function DropPage() {
  const { t } = useTranslation();
  const { dropId } = useParams<{ dropId: string }>();
  const [session, setSession] = useState<ReceiveSessionResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        if (!dropId) throw new Error("no drop id");
        const s = await getReceiveSession(dropId);
        if (!s.is_open) { setStep("closed"); return; }
        setSession(s);
        setStep("ready");
      } catch (err) {
        if (err instanceof ApiError && (err.code === "not_found" || err.code === "gone")) {
          setStep("closed");
        } else {
          setErrorMsg(t("drop.errorLoad"));
          setStep("error");
        }
      }
    })();
  }, [dropId, t]);

  async function handleUpload() {
    if (!file || !session || !dropId) return;
    try {
      setStep("sealing");
      setProgressPct(0);

      const ownerPubKey = await importPublicKey(session.public_key);
      const fileKey = await generateFileKey();
      const fileIv = generateIV();
      const metaIv = generateIV();
      const chunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

      const [encryptedMeta, wrapping] = await Promise.all([
        encryptMetadata(
          { filename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, padded: true, chunkCount },
          fileKey,
          metaIv,
        ),
        wrapFileKey(fileKey, ownerPubKey),
      ]);

      setStep("uploading");

      const { received_file_id } = await receiveFileInit(dropId, {
        size_bytes: file.size,
        chunk_count: chunkCount,
        encrypted_metadata: toBase64Url(encryptedMeta),
        metadata_iv: toBase64Url(metaIv.buffer as ArrayBuffer),
        file_iv: toBase64Url(fileIv.buffer as ArrayBuffer),
        wrapped_file_key: wrapping.wrappedKey,
        ephemeral_public_key: wrapping.ephemeralPublicKey,
        wrapped_key_iv: wrapping.wrappedKeyIv,
      });

      for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        let chunkData = await file.slice(start, end).arrayBuffer();
        if (i === chunkCount - 1) chunkData = padToBlock(chunkData);
        const encrypted = await encryptChunk(chunkData, fileKey, fileIv, i);
        await receiveChunk(dropId, received_file_id, i, encrypted);
        setProgressPct(Math.round(((i + 1) / chunkCount) * 100));
      }

      await receiveComplete(dropId, received_file_id);
      setProgressPct(100);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && (err.code === "not_found" || err.code === "gone")) {
        setStep("closed");
      } else {
        setErrorMsg(t("drop.uploadFailed"));
        setStep("error");
      }
    }
  }

  if (step === "loading") {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="subtitle">{t("drop.loading")}</p>
        </div>
      </div>
    );
  }

  if (step === "closed") {
    return (
      <div className="page">
        <div className="card stack" style={{ textAlign: "center" }}>
          <MotionIconStack variant="drop" />
          <div className="success-icon">🔒</div>
          <h1 className="title">{t("drop.closed.title")}</h1>
          <p className="subtitle">{t("drop.closed.subtitle")}</p>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="card stack" style={{ textAlign: "center" }}>
          <MotionIconStack variant="drop" />
          <div className="success-icon">✅</div>
          <h1 className="title">{t("drop.done.title")}</h1>
          <p className="subtitle">{t("drop.done.subtitle")}</p>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="drop" />
        <div className="success-icon" style={{ textAlign: "center" }}>📥</div>
        <div>
          <h1 className="title">{t("drop.ready.title")}</h1>
          {session && (
            <p className="subtitle">{formatExpiry(session.expires_at)} · {session.received_file_count}/{session.max_files} files</p>
          )}
        </div>

        <FilePicker file={file} onFile={setFile} />

        {step === "error" && <div className="error-box motion-reveal">{errorMsg}</div>}

        {step === "sealing" || step === "uploading" ? (
          <div className="stack-sm motion-reveal">
            <ProgressBar
              value={progressPct}
              label={step === "sealing" ? t("drop.ready.sealing") : t("drop.ready.uploading", { pct: progressPct })}
            />
            <p className="hint" style={{ textAlign: "center" }}>
              {step === "sealing"
                ? t("drop.ready.sealing")
                : t("drop.ready.uploading", { pct: progressPct })}
            </p>
          </div>
        ) : (
          <button className="btn btn-primary" disabled={!file} onClick={() => void handleUpload()}>
            {t("drop.ready.sealBtn")}
          </button>
        )}

        <p className="safety-label">
          {t("drop.ready.safety").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
