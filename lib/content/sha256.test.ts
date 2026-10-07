import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { sha256Hex } from "./sha256";

// F22 — the approval hash must be the standard SHA-256 of the UTF-8 bytes, or
// the site (PHP `hash('sha256', …)`) could not check the same approvals.

const reference = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("sha256Hex", () => {
  it("matches the FIPS 180-2 test vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("agrees with node:crypto on Spanish, Guaraní and emoji text", () => {
    for (const text of [
      "Revisado por la Dra. Ana Giménez — ñandutí, pya'e, ỹ",
      "Tereré\ncon yuyos\t🌿",
      "a".repeat(55),
      "a".repeat(56),
      "a".repeat(64),
      "é".repeat(1000),
    ]) {
      expect(sha256Hex(text), text.slice(0, 20)).toBe(reference(text));
    }
  });

  it("agrees with node:crypto on random input of every block boundary", () => {
    for (let length = 0; length < 200; length++) {
      const text = randomBytes(length).toString("latin1");
      expect(sha256Hex(text)).toBe(reference(text));
    }
  });
});
