import { useTranslation } from "react-i18next";

declare const __BUILD_COMMIT__: string;

export function BuildBadge() {
  const { t } = useTranslation();
  const commit =
    typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "dev";
  return (
    <a
      href="/checksums.txt"
      className="build-badge"
      title={t("landing.footer.buildChecksums")}
      target="_blank"
      rel="noopener noreferrer"
    >
      build {commit}
    </a>
  );
}
