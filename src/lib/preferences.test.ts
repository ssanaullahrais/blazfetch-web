import { describe, expect, it } from "vitest";
import { parseDownloadMethods } from "./preferences";

describe("parseDownloadMethods", () => {
  it("offers all three methods when nothing is set", () => {
    expect(parseDownloadMethods(undefined)).toEqual(["auto", "stream", "prepare"]);
    expect(parseDownloadMethods("  ")).toEqual(["auto", "stream", "prepare"]);
  });

  it("offers only the listed methods, in a fixed order, ignoring case, spaces and duplicates", () => {
    expect(parseDownloadMethods("auto")).toEqual(["auto"]);
    expect(parseDownloadMethods("Prepare, AUTO")).toEqual(["auto", "prepare"]);
    expect(parseDownloadMethods("stream,stream")).toEqual(["stream"]);
  });

  it("falls back to Automatic when the list has nothing valid", () => {
    expect(parseDownloadMethods("nonsense,,")).toEqual(["auto"]);
  });

  it("keeps the old VITE_ENABLE_DOWNLOAD_METHODS=false meaning (Automatic only) unless a list is given", () => {
    expect(parseDownloadMethods(undefined, "false")).toEqual(["auto"]);
    expect(parseDownloadMethods("auto,stream", "false")).toEqual(["auto", "stream"]);
    expect(parseDownloadMethods(undefined, "true")).toEqual(["auto", "stream", "prepare"]);
  });
});
