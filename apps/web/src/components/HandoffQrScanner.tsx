import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ScannerStep = "idle" | "starting" | "scanning" | "error" | "unsupported";

interface Props {
  onCode: (code: string) => void;
}

interface BarcodeResult {
  rawValue: string;
}

interface BarcodeDetectorCtor {
  new(options?: { formats?: string[] }): { detect(source: CanvasImageSource): Promise<BarcodeResult[]> };
  getSupportedFormats?: () => Promise<string[]>;
}

interface ScannerWindow extends Window {
  BarcodeDetector?: BarcodeDetectorCtor;
}

const HANDOFF_CODE_RE = /[A-Z2-9]{6}[\s-]*\d{3}[\s-]*\d{3}[\s-]*\d{3}/i;

export function extractHandoffCode(text: string) {
  return text.match(HANDOFF_CODE_RE)?.[0] ?? null;
}

function hasCameraSupport() {
  const win = window as ScannerWindow;
  return Boolean(win.BarcodeDetector && navigator.mediaDevices?.getUserMedia);
}

export function HandoffQrScanner({ onCode }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [step, setStep] = useState<ScannerStep>(() => hasCameraSupport() ? "idle" : "unsupported");

  useEffect(() => {
    return () => stop();
  }, []);

  function stop() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function start() {
    const win = window as ScannerWindow;
    if (!win.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setStep("unsupported");
      return;
    }

    setStep("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("missing video element");

      video.srcObject = stream;
      await video.play();

      const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
      setStep("scanning");

      const scan = async () => {
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const results = await detector.detect(video);
            for (const result of results) {
              const code = extractHandoffCode(result.rawValue);
              if (code) {
                stop();
                setStep("idle");
                onCode(code);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(() => { void scan(); });
        } catch {
          stop();
          setStep("error");
        }
      };

      await scan();
    } catch {
      stop();
      setStep("error");
    }
  }

  if (step === "unsupported") return null;

  return (
    <div className="qr-scanner stack-sm">
      {step === "idle" || step === "error" ? (
        <button className="btn btn-secondary" type="button" onClick={() => void start()}>
          {t("open.scanBtn")}
        </button>
      ) : null}
      {step === "starting" && <p className="hint">{t("open.scanStarting")}</p>}
      {(step === "starting" || step === "scanning") && (
        <div className="qr-scanner__frame motion-reveal">
          <video ref={videoRef} muted playsInline />
          {step === "scanning" && (
            <button className="link-box__btn qr-scanner__stop" type="button" onClick={() => { stop(); setStep("idle"); }}>
              {t("open.scanStop")}
            </button>
          )}
        </div>
      )}
      {step === "error" && <p className="hint" style={{ color: "var(--color-error)" }}>{t("open.scanError")}</p>}
    </div>
  );
}
