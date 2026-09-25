import { describe, expect, it } from "vitest";
import { instagramProfileUrl, instagramStoriesUrl, parseInstagramProfileLink } from "./instagram-links";

describe("parseInstagramProfileLink", () => {
  it("recognises profiles, with or without a query or trailing slash", () => {
    expect(parseInstagramProfileLink("https://www.instagram.com/ajaydevgn/?hl=en")).toEqual({ username: "ajaydevgn", kind: "profile" });
    expect(parseInstagramProfileLink("https://instagram.com/some.user_1")).toEqual({ username: "some.user_1", kind: "profile" });
  });

  it("recognises a stories link", () => {
    expect(parseInstagramProfileLink("https://www.instagram.com/stories/ajaydevgn/")).toEqual({ username: "ajaydevgn", kind: "stories" });
    expect(parseInstagramProfileLink("https://www.instagram.com/stories/ajaydevgn/3712345678901234567/")).toEqual({ username: "ajaydevgn", kind: "stories" });
  });

  it("ignores posts, reels, highlights and other sites", () => {
    expect(parseInstagramProfileLink("https://www.instagram.com/p/DdtviT1KYcv/")).toBeNull();
    expect(parseInstagramProfileLink("https://www.instagram.com/reel/DdtviT1KYcv/")).toBeNull();
    expect(parseInstagramProfileLink("https://www.instagram.com/stories/highlights/17900000000000000/")).toBeNull();
    expect(parseInstagramProfileLink("https://www.instagram.com/ajaydevgn/reels/")).toBeNull();
    expect(parseInstagramProfileLink("https://example.com/ajaydevgn/")).toBeNull();
    expect(parseInstagramProfileLink("not a url")).toBeNull();
  });

  it("builds the two links", () => {
    expect(instagramProfileUrl("a.b")).toBe("https://www.instagram.com/a.b/");
    expect(instagramStoriesUrl("a.b")).toBe("https://www.instagram.com/stories/a.b/");
  });
});
