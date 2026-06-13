// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { usePageTitle } from "./use-page-title.js";

afterEach(() => {
  cleanup();
  document.title = "test";
});

describe("usePageTitle", () => {
  it("sets document.title on mount", () => {
    renderHook(() => usePageTitle("My Page"));
    expect(document.title).toBe("My Page");
  });

  it("restores previous title on unmount", () => {
    document.title = "Original";
    const { unmount } = renderHook(() => usePageTitle("New Title"));
    expect(document.title).toBe("New Title");
    unmount();
    expect(document.title).toBe("Original");
  });

  it("updates title when key changes", () => {
    const { rerender } = renderHook(
      ({ title }) => usePageTitle(title),
      { initialProps: { title: "First" } },
    );
    expect(document.title).toBe("First");
    rerender({ title: "Second" });
    expect(document.title).toBe("Second");
  });
});
