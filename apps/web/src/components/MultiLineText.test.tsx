// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MultiLineText } from "./MultiLineText.js";

afterEach(() => {
  cleanup();
});

describe("MultiLineText", () => {
  it("renders single line without break", () => {
    render(<MultiLineText text="Hello world" className="test" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders two lines with a br between them", () => {
    const { container } = render(<MultiLineText text="Line one\nLine two" className="test" />);
    const p = container.querySelector("p.test");
    expect(p).toBeInTheDocument();
    expect(p?.querySelector("br")).toBeInTheDocument();
  });

  it("applies the className", () => {
    const { container } = render(<MultiLineText text="Text" className="my-class" />);
    expect(container.querySelector("p.my-class")).toBeInTheDocument();
  });
});
