import { Turnstile } from "@marsidev/react-turnstile";

const SITE_KEY = import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined;

interface Props {
  onToken: (token: string) => void;
  onExpire: () => void;
}

/**
 * Renders a Cloudflare Turnstile widget when VITE_TURNSTILE_SITE_KEY is configured.
 * In local dev (no key set) the component renders nothing — validation is also
 * skipped server-side when TURNSTILE_SECRET_KEY is absent.
 */
export function TurnstileWidget({ onToken, onExpire }: Props) {
  if (!SITE_KEY) return null;

  return (
    <Turnstile
      siteKey={SITE_KEY}
      options={{ theme: "light", size: "normal" }}
      onSuccess={onToken}
      onExpire={onExpire}
      onError={onExpire}
    />
  );
}

export const turnstileEnabled = Boolean(SITE_KEY);
