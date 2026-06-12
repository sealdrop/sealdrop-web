import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { deleteSendFile, ApiError } from "../lib/api.js";

type Step = "confirming" | "deleting" | "done" | "error";

export function SendFileDeletePage() {
  const { t } = useTranslation();
  const { fileId } = useParams<{ fileId: string }>();
  const [step, setStep] = useState<Step>("confirming");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const match = /[#&]token=([^&]+)/.exec(window.location.hash);
    if (!match) {
      setErrorMsg(t("deleteFile.error.missingToken"));
      setStep("error");
    }
  }, [fileId, t]);

  async function handleDelete() {
    if (!fileId) return;
    const match = /[#&]token=([^&]+)/.exec(window.location.hash);
    if (!match) return;

    try {
      setStep("deleting");
      await deleteSendFile(fileId, match[1]!);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && err.code === "not_found") {
        setErrorMsg(t("deleteFile.error.expired"));
      } else {
        setErrorMsg(t("deleteFile.error.failed"));
      }
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="card stack" style={{ textAlign: "center" }}>
          <div className="success-icon">🗑️</div>
          <h1 className="title">{t("deleteFile.done.title")}</h1>
          <p className="subtitle">{t("deleteFile.done.subtitle")}</p>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="page">
        <div className="card stack">
          <div className="success-icon">🔒</div>
          <h1 className="title" style={{ textAlign: "center" }}>{t("deleteFile.error.title")}</h1>
          <div className="error-box">{errorMsg}</div>
          <a href="/" className="btn btn-secondary">{t("common.goToSealDrop")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card stack" style={{ textAlign: "center" }}>
        <div className="success-icon">🗑️</div>
        <h1 className="title">{t("deleteFile.confirm.title")}</h1>
        <p className="subtitle">
          {t("deleteFile.confirm.subtitle").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </p>
        {step === "deleting" ? (
          <div className="stack-sm">
            <div className="progress"><div className="progress__bar" style={{ width: "70%" }} /></div>
            <p className="hint" style={{ textAlign: "center" }}>{t("deleteFile.confirm.deleting")}</p>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => void handleDelete()} style={{ background: "var(--color-error)" }}>
            {t("deleteFile.confirm.deleteBtn")}
          </button>
        )}
      </div>
    </div>
  );
}
