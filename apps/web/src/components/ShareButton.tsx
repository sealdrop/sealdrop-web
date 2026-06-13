import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  title?: string;
  className?: string;
}

export function ShareButton({ text, title = "SealDrop", className = "link-box__btn" }: Props) {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!("share" in navigator)) return;

    const data = { title, text };
    const canShare = "canShare" in navigator
      ? navigator.canShare(data)
      : true;
    setSupported(canShare);
  }, [text, title]);

  async function share() {
    try {
      await navigator.share({ title, text });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Do not log shared text: SealDrop links may contain URL-fragment keys.
    }
  }

  if (!supported) return null;

  return (
    <button
      className={`${className}${shared ? " link-box__btn--copied" : ""}`}
      onClick={() => void share()}
      type="button"
      aria-label={shared ? t("shareBtn.shared") : t("shareBtn.share")}
    >
      {shared ? t("shareBtn.shared") : t("shareBtn.share")}
    </button>
  );
}
