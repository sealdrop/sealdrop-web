import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
}

export function CopyButton({ text, label, className = "link-box__btn", ariaLabel }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-secure contexts or without permission
    }
  }

  return (
    <button
      className={`${className}${copied ? " link-box__btn--copied" : ""}`}
      onClick={copy}
      type="button"
      aria-label={ariaLabel}
    >
      {copied ? t("copyBtn.copied") : (label ?? t("copyBtn.copy"))}
    </button>
  );
}
