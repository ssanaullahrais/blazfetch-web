import { describe, expect, it } from "vitest";
import { safeHref } from "@/lib/safe-url";

describe("safeHref", () => {
  it("keeps http(s) links", () => {
    expect(safeHref("https://www.youtube.com/watch?v=abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(safeHref("http://example.com/")).toBe("http://example.com/");
  });

  it("drops anything else", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "//evil.example", "not a url", "", null, undefined]) {
      expect(safeHref(bad as string)).toBeUndefined();
    }
  });
});
