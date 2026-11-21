import { describe, expect, it } from "vitest";

import { decodeBase64Url } from "./base64-url";

describe("decodeBase64Url", () => {
  it("decodes the URL-safe alphabet without padding", () => {
    expect([...decodeBase64Url("-_8")]).toEqual([0xfb, 0xff]);
  });

  it("accepts padded text", () => {
    expect([...decodeBase64Url("aGk=")]).toEqual([0x68, 0x69]);
  });

  it("decodes a VAPID public key to an uncompressed P-256 point", () => {
    const key = decodeBase64Url(
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    );

    expect(key).toHaveLength(65);
    expect(key[0]).toBe(0x04);
  });
});
