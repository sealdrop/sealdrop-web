import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function mobilePlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const isIpadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOS) return "ios";
  return null;
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true;
}

export function InstallHint() {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    setPlatform(mobilePlatform());
  }, []);

  if (!platform) return null;

  return (
    <div className="install-hint" role="note">
      <strong>{t("installHint.title")}</strong>
      <span>{t(`installHint.${platform}`)}</span>
    </div>
  );
}
