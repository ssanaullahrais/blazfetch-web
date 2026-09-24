import { describe, expect, it } from "vitest";
import { createSite, pageTitle } from "@/config/site";

describe("createSite", () => {
  it("has sensible defaults", () => {
    const site = createSite({});
    expect(site.name).toBe("BlazFetch");
    expect(site.url).toMatch(/^https:\/\//);
  });

  it("is white-labelled entirely by VITE_SITE_* variables, and trims the URL", () => {
    const site = createSite({ VITE_SITE_NAME: "My Saver", VITE_SITE_URL: "https://saver.example.com//", VITE_SITE_TAGLINE: "Save it." });
    expect(site).toMatchObject({ name: "My Saver", url: "https://saver.example.com", tagline: "Save it." });
  });
});

describe("pageTitle", () => {
  it("puts the page first and the site name last", () => {
    expect(pageTitle("Some video")).toMatch(/^Some video · /);
    expect(pageTitle(null)).toBe(pageTitle());
  });
});
