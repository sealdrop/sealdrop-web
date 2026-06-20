import type { CSSProperties } from "react";
import logo48 from "../assets/sealdrop-logo-48.webp";
import logo84 from "../assets/sealdrop-logo-84.webp";
import logo120 from "../assets/sealdrop-logo-120.webp";
import logo192 from "../assets/sealdrop-logo-192.webp";

interface BrandLogoProps {
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function BrandLogo({ height = 40, className, style }: BrandLogoProps) {
  const width = height;

  return (
    <img
      className={`brand-logo${className ? ` ${className}` : ""}`}
      src={logo48}
      srcSet={`${logo48} 48w, ${logo84} 84w, ${logo120} 120w, ${logo192} 192w`}
      sizes="(max-width: 640px) 48px, (max-width: 1024px) 84px, 120px"
      alt="SealDrop"
      width={width}
      height={height}
      style={{ display: "block", ...style }}
    />
  );
}
