import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

const DATABASE_URL = "postgres://hazardwatch:hazardwatch@localhost:5433/hazardwatch";

describe("loadConfig", () => {
  it("runs without email by default", () => {
    const config = loadConfig({ DATABASE_URL, SMTP_URL: "" });

    expect(config.SMTP_URL).toBeUndefined();
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("reads the email settings", () => {
    const config = loadConfig({
      DATABASE_URL,
      SMTP_URL: "smtps://user:secret@smtp.example.com:465",
      EMAIL_FROM: "Alerts <alerts@example.com>",
      APP_URL: "https://hazardwatch.example.com",
    });

    expect(config).toMatchObject({
      SMTP_URL: "smtps://user:secret@smtp.example.com:465",
      EMAIL_FROM: "Alerts <alerts@example.com>",
      APP_URL: "https://hazardwatch.example.com",
    });
  });

  it("treats blank email settings as unset", () => {
    const config = loadConfig({ DATABASE_URL, SMTP_URL: "", EMAIL_FROM: "", APP_URL: "" });

    expect(config).toMatchObject({
      SMTP_URL: undefined,
      EMAIL_FROM: "HazardWatch <alerts@hazardwatch.localhost>",
      APP_URL: undefined,
    });
  });

  it("requires the app URL to send email", () => {
    expect(() => loadConfig({ DATABASE_URL, SMTP_URL: "smtp://localhost:1025" })).toThrow(
      /APP_URL is required to send email/,
    );
  });

  it("rejects an SMTP URL with another protocol", () => {
    expect(() =>
      loadConfig({
        DATABASE_URL,
        SMTP_URL: "http://localhost:1025",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrow(/SMTP_URL/);
  });
});
