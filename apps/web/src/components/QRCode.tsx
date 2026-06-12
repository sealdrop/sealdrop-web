import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCodeLib from "qrcode";

interface Props {
  url: string;
}

export function QRCode({ url }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show && canvasRef.current) {
      void QRCodeLib.toCanvas(canvasRef.current, url, { width: 200, margin: 2 });
    }
  }, [show, url]);

  return (
    <div className="stack-sm">
      <button className="qr-toggle" type="button" onClick={() => setShow((s) => !s)}>
        {show ? t("qr.hide") : t("qr.show")}
      </button>
      {show && (
        <div className="qr-wrap">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}
