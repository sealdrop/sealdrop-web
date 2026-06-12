import { useTranslation } from "react-i18next";
import type { SendExpiryPreset, ReceiveExpiryPreset } from "@sealdrop/shared";

interface SendProps {
  mode: "send";
  value: SendExpiryPreset;
  onChange: (v: SendExpiryPreset) => void;
}

interface ReceiveProps {
  mode: "receive";
  value: ReceiveExpiryPreset;
  onChange: (v: ReceiveExpiryPreset) => void;
}

type Props = SendProps | ReceiveProps;

export function ExpirySelector(props: Props) {
  const { t } = useTranslation();

  const sendOptions: { value: SendExpiryPreset; label: string }[] = [
    { value: "open-once", label: t("expiry.send.openOnce") },
    { value: "1h", label: t("expiry.send.1h") },
    { value: "today", label: t("expiry.send.today") },
    { value: "3d", label: t("expiry.send.3d") },
    { value: "7d", label: t("expiry.send.7d") },
  ];

  const receiveOptions: { value: ReceiveExpiryPreset; label: string }[] = [
    { value: "one-file", label: t("expiry.receive.oneFile") },
    { value: "1h", label: t("expiry.receive.1h") },
    { value: "today", label: t("expiry.receive.today") },
    { value: "3-files", label: t("expiry.receive.3files") },
    { value: "7d", label: t("expiry.receive.7d") },
  ];

  const options = props.mode === "send" ? sendOptions : receiveOptions;

  return (
    <div className="stack-sm">
      <label className="label" htmlFor="expiry">{t("expiry.label")}</label>
      <select
        id="expiry"
        className="select"
        value={props.value}
        onChange={(e) => {
          if (props.mode === "send") {
            props.onChange(e.target.value as SendExpiryPreset);
          } else {
            props.onChange(e.target.value as ReceiveExpiryPreset);
          }
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
