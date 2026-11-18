import { describe, expect, it } from "vitest";

import { previewUrls } from "./deployment";

describe("previewUrls", () => {
  it("lists the branch URL, then the deployment URL, of a preview", () => {
    expect(
      previewUrls({
        VERCEL_ENV: "preview",
        VERCEL_URL: "hazardwatch-abc123-hiratra.vercel.app",
        VERCEL_BRANCH_URL: "hazardwatch-git-feat-x-hiratra.vercel.app",
      }),
    ).toEqual([
      "https://hazardwatch-git-feat-x-hiratra.vercel.app",
      "https://hazardwatch-abc123-hiratra.vercel.app",
    ]);
  });

  it("skips a URL Vercel did not set", () => {
    expect(previewUrls({ VERCEL_ENV: "preview", VERCEL_URL: "deployment.vercel.app" })).toEqual([
      "https://deployment.vercel.app",
    ]);
  });

  it("is empty outside previews", () => {
    expect(previewUrls({ VERCEL_ENV: "production", VERCEL_URL: "hazardwatch.vercel.app" })).toEqual(
      [],
    );
    expect(previewUrls({})).toEqual([]);
  });
});
