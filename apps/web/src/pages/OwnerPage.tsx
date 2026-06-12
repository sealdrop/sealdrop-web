import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  parseOwnerFragment,
  fragmentToPrivateKey,
  fromBase64Url,
  unwrapFileKey,
  decryptChunk,
  decryptMetadata,
} from "@sealdrop/crypto";
import type { FileMetadata } from "@sealdrop/crypto";
import type { ReceivedFileRecord } from "@sealdrop/shared";
import { getOwnerFiles, getOwnerFileChunk, ApiError } from "../lib/api.js";
import { formatBytes, downloadStream, needsLargeDownloadWarning } from "../lib/format.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { MotionIconStack } from "../components/MotionIconStack.js";

interface FileState {
  record: ReceivedFileRecord;
  meta: FileMetadata | null;
  unlocking: boolean;
  done: boolean;
  error: string;
  progressPct: number;
}

export function OwnerPage() {
  const { t } = useTranslation();
  const { dropId } = useParams<{ dropId: string }>();
  const [files, setFiles] = useState<FileState[]>([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [privateKeyFragment, setPrivateKeyFragment] = useState<string | null>(null);

  useEffect(() => {
    const fragment = parseOwnerFragment(window.location.hash);
    if (!fragment) {
      setPageError(t("owner.error.missingKey"));
      setLoading(false);
      return;
    }
    setPrivateKeyFragment(fragment);

    void (async () => {
      try {
        if (!dropId) throw new Error("no drop id");
        const { files: records } = await getOwnerFiles(dropId);
        setFiles(records.map((r) => ({ record: r, meta: null, unlocking: false, done: false, error: "", progressPct: 0 })));
      } catch (err) {
        if (err instanceof ApiError && (err.code === "not_found" || err.code === "gone")) {
          setPageError(t("owner.error.expired"));
        } else {
          setPageError(t("owner.error.loadFailed"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [dropId, t]);

  async function handleUnlock(index: number) {
    const entry = files[index];
    if (!entry || !dropId || !privateKeyFragment) return;

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, unlocking: true, error: "", progressPct: 0 } : f)),
    );

    try {
      const ownerPrivKey = await fragmentToPrivateKey(privateKeyFragment);
      const r = entry.record;

      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progressPct: 10 } : f)),
      );

      const fileKey = await unwrapFileKey(
        r.wrapped_file_key,
        r.ephemeral_public_key,
        r.wrapped_key_iv,
        ownerPrivKey,
      );

      const metaIv = new Uint8Array(fromBase64Url(r.metadata_iv)) as Uint8Array<ArrayBuffer>;
      const fileIv = new Uint8Array(fromBase64Url(r.file_iv)) as Uint8Array<ArrayBuffer>;
      const encMeta = fromBase64Url(r.encrypted_metadata);

      const meta = await decryptMetadata(encMeta, fileKey, metaIv);

      const chunkCount = r.chunk_count;
      let chunkIdx = 0;

      const plaintextStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (chunkIdx >= chunkCount) {
            controller.close();
            return;
          }
          const encChunk = await getOwnerFileChunk(dropId, r.received_file_id, chunkIdx);
          const plain = await decryptChunk(encChunk, fileKey, fileIv, chunkIdx);
          chunkIdx++;
          controller.enqueue(new Uint8Array(plain));
          setFiles((prev) =>
            prev.map((f, j) => (j === index ? { ...f, progressPct: 10 + Math.round((chunkIdx / chunkCount) * 90) } : f)),
          );
        },
      });

      await downloadStream(meta.filename, plaintextStream, {
        maxBytes: meta.sizeBytes,
        totalBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
      });

      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progressPct: 100 } : f)),
      );

      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, meta, unlocking: false, done: true } : f)),
      );
    } catch (err) {
      const msg =
        err instanceof ApiError && (err.code === "not_found" || err.code === "gone")
          ? t("owner.fileUnavailable")
          : t("owner.unlockFailed");
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, unlocking: false, error: msg } : f)),
      );
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="subtitle">{t("owner.loading")}</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="page">
        <div className="card stack">
          <MotionIconStack variant="owner" />
          <div className="success-icon">🔒</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("owner.error.title")}</h1>
          <div className="error-box motion-reveal">{pageError}</div>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack">
        <MotionIconStack variant="owner" />
        <div>
          <h1 className="title">{t("owner.title")}</h1>
          <p className="subtitle">{t("owner.subtitle")}</p>
        </div>

        {files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <p style={{ fontSize: "2rem" }}>📭</p>
            <p className="subtitle" style={{ marginTop: "0.5rem" }}>
              {t("owner.empty").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 ? <br /> : null}</span>
              ))}
            </p>
          </div>
        ) : (
          <div className="stack">
            {files.map((f, i) => (
              <div key={f.record.received_file_id} className="file-card motion-reveal">
                <span className="file-card__icon">{f.done ? "✅" : "📄"}</span>
                <div className="file-card__info">
                  <p className="file-card__name">
                    {f.meta ? f.meta.filename : t("owner.sealedFile", { n: i + 1 })}
                  </p>
                  <p className="file-card__meta">
                    {f.meta
                      ? `${formatBytes(f.meta.sizeBytes)} · ${f.meta.mimeType}`
                      : formatBytes(f.record.size_bytes)}
                  </p>
                  {f.error && <p className="motion-reveal" style={{ color: "var(--color-error)", fontSize: "0.8125rem" }}>{f.error}</p>}
                  {!f.done && needsLargeDownloadWarning(f.meta ? f.meta.sizeBytes : f.record.size_bytes) && (
                    <p className="hint">{t("common.largeDownloadWarning")}</p>
                  )}
                  {f.unlocking && !f.done && (
                    <div className="motion-reveal">
                      <ProgressBar value={f.progressPct} label={t("owner.downloading", { name: f.record.received_file_id })} />
                    </div>
                  )}
                </div>
                <button
                  className="file-card__btn"
                  disabled={f.unlocking || f.done}
                  onClick={() => void handleUnlock(i)}
                >
                  {f.done ? t("owner.saved") : f.unlocking ? "…" : t("owner.unlock")}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="safety-label">
          {t("owner.safety").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
