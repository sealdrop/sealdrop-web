interface Props {
  value: number;
  label: string;
  max?: number;
}

export function ProgressBar({ value, label, max = 100 }: Props) {
  const clamped = Math.max(0, Math.min(max, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="progress__bar" style={{ width: `${(clamped / max) * 100}%` }} />
    </div>
  );
}
