// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar.js";

afterEach(() => cleanup());

describe("ProgressBar", () => {
  it("renders with role=progressbar and ARIA value attributes", () => {
    render(<ProgressBar value={42} label="Uploading" />);
    const bar = screen.getByRole("progressbar", { name: "Uploading" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps values to 0-100", () => {
    const { rerender } = render(<ProgressBar value={-10} label="clamp" />);
    expect(screen.getByRole("progressbar", { name: "clamp" })).toHaveAttribute("aria-valuenow", "0");

    rerender(<ProgressBar value={150} label="clamp" />);
    expect(screen.getByRole("progressbar", { name: "clamp" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("uses the label as accessible name", () => {
    render(<ProgressBar value={50} label="Encrypting file" />);
    expect(screen.getByRole("progressbar", { name: "Encrypting file" })).toBeInTheDocument();
  });
});
