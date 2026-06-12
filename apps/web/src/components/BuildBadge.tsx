declare const __BUILD_COMMIT__: string;

export function BuildBadge() {
  const commit =
    typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "dev";
  return (
    <a
      href="/checksums.txt"
      className="build-badge"
      title="View build checksums"
      target="_blank"
      rel="noopener noreferrer"
    >
      build {commit}
    </a>
  );
}
