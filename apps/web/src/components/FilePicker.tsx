import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../lib/format.js";
import { MAX_FILE_SIZE_BYTES } from "@sealdrop/shared";

interface Props {
  file: File | null;
  onFile: (f: File) => void;
}

export function FilePicker({ file, onFile }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  function pick(f: File) {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    onFile(f);
  }

  return (
    <div className="stack-sm">
      <div
        className={`file-picker${dragOver ? " file-picker--dragover" : ""}${file ? " file-picker--selected" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={file ? t("filePicker.ariaSelected", { name: file.name }) : t("filePicker.ariaChoose")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) pick(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />
        {file ? (
          <>
            <span className="file-picker__icon">📄</span>
            <span className="file-picker__text">{file.name}</span>
            <span className="file-picker__hint">{formatBytes(file.size)} · {t("filePicker.tapToChange")}</span>
          </>
        ) : (
          <>
            <span className="file-picker__icon">📁</span>
            <span className="file-picker__text">{t("filePicker.tapToChoose")}</span>
            <span className="file-picker__hint">{t("filePicker.hint")}</span>
          </>
        )}
      </div>
      {sizeError && (
        <p className="hint" style={{ color: "var(--color-error)" }}>
          {t("filePicker.tooLarge", { size: formatBytes(MAX_FILE_SIZE_BYTES) })}
        </p>
      )}
    </div>
  );
}
