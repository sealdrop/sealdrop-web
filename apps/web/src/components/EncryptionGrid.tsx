const GRID_COLS = 8;
const GRID_ROWS = 8;
const TOTAL_BLOCKS = GRID_COLS * GRID_ROWS;

interface Props {
  progress: number;
}

export function EncryptionGrid({ progress }: Props) {
  const filledCount = Math.round((progress / 100) * TOTAL_BLOCKS);

  return (
    <div
      className="enc-grid"
      role="progressbar"
      aria-label="Encrypting file"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: "0.3rem",
        maxWidth: "16rem",
        margin: "0 auto",
      }}
    >
      {Array.from({ length: TOTAL_BLOCKS }, (_, i) => (
        <div
          key={i}
          className={`enc-block ${i < filledCount ? "enc-block--filled" : ""}`}
          style={{
            animationDelay: i < filledCount ? `${i * 12}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
