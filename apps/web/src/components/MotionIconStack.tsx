type Variant = "send" | "receive" | "open" | "drop" | "file" | "owner";

const iconsByVariant: Record<Variant, string[]> = {
  send: ["📄", "🔐", "↗", "✓"],
  receive: ["📥", "🔑", "⬢", "✓"],
  open: ["⌁", "🔢", "🔓", "↗"],
  drop: ["📥", "🔐", "↑", "✓"],
  file: ["📨", "🔓", "↓", "✓"],
  owner: ["🔑", "📄", "↓", "✓"],
};

interface Props {
  variant: Variant;
}

export function MotionIconStack({ variant }: Props) {
  return (
    <div className={`motion-icon-stack motion-icon-stack--${variant}`} aria-hidden="true">
      {iconsByVariant[variant].map((icon, index) => (
        <span key={`${variant}-${icon}-${index}`} className="motion-icon-stack__item">
          {icon}
        </span>
      ))}
    </div>
  );
}
