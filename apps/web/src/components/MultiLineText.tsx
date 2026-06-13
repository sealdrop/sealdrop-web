interface MultiLineTextProps {
  text: string;
  className?: string;
}

export function MultiLineText({ text, className }: MultiLineTextProps) {
  return (
    <p className={className}>
      {text.split("\n").map((line, i) => (
        <span key={i}>{line}{i === 0 ? <br /> : null}</span>
      ))}
    </p>
  );
}
