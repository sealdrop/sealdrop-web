import { CopyButton } from "./CopyButton.js";
import { ShareButton } from "./ShareButton.js";

interface Props {
  label: string;
  url: string;
  warning?: string;
}

export function LinkBox({ label, url, warning }: Props) {
  return (
    <div className="stack-sm">
      <span className="label">{label}</span>
      <div className="link-box">
        <span className="link-box__url" title={url}>{url}</span>
        <ShareButton text={url} />
        <CopyButton text={url} />
      </div>
      {warning && <p className="hint" style={{ color: "var(--de-text-tertiary)" }}>{warning}</p>}
    </div>
  );
}
