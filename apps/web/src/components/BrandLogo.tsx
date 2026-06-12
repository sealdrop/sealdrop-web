import type { CSSProperties } from "react";
import logoTransparent from "../assets/sealdrop-logo-transparent.png";

interface BrandLogoProps {
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function BrandLogo({ height = 40, className, style }: BrandLogoProps) {
  return (
    <img
      className={`brand-logo${className ? ` ${className}` : ""}`}
      src={logoTransparent}
      alt="SealDrop"
      height={height}
      style={{ display: "block", ...style }}
    />
  );
}
