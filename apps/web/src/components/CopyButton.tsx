import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className = "link-box__btn" }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className={`${className}${copied ? " link-box__btn--copied" : ""}`}
      onClick={copy}
      type="button"
    >
      {copied ? t("copyBtn.copied") : (label ?? t("copyBtn.copy"))}
    </button>
  );
}
