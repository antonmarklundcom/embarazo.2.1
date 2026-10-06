import { describe, expect, it } from "vitest";
import {
  DUMMY_HASH_FOR_TIMING,
  EmailSchema,
  NewPasswordSchema,
  PasswordSchema,
  fitsBcrypt,
  hashPassword,
  verifyPassword,
} from "./password";

describe("EmailSchema", () => {
  it("accepts a normal address and lowercases/trims it", () => {
    expect(EmailSchema.parse("  Ana@Example.com ")).toBe("ana@example.com");
  });

  it("rejects a non-email string", () => {
    expect(EmailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(EmailSchema.safeParse("").success).toBe(false);
  });
});

describe("PasswordSchema", () => {
  it("rejects anything under 8 characters", () => {
    expect(PasswordSchema.safeParse("short1").success).toBe(false);
  });

  it("accepts an 8-character password", () => {
    expect(PasswordSchema.safeParse("abcdefgh").success).toBe(true);
  });

  it("rejects an absurdly long input", () => {
    expect(PasswordSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(
      verifyPassword("correct horse battery staple", hash),
    ).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("never produces the same hash twice (random salt)", async () => {
    const a = await hashPassword("same input");
    const b = await hashPassword("same input");
    expect(a).not.toBe(b);
  });
});

describe("DUMMY_HASH_FOR_TIMING", () => {
  it("is a valid bcrypt hash that never verifies", async () => {
    await expect(
      verifyPassword("anything at all", DUMMY_HASH_FOR_TIMING),
    ).resolves.toBe(false);
  });
});

describe("F17 — a password being set must fit bcrypt's 72 bytes", () => {
  it("accepts exactly 72 bytes and refuses 73", () => {
    expect(NewPasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(NewPasswordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });

  it("counts UTF-8 bytes, not characters: 37 'ñ' is 74 bytes", () => {
    expect(fitsBcrypt("ñ".repeat(36))).toBe(true);
    expect(fitsBcrypt("ñ".repeat(37))).toBe(false);
    expect(NewPasswordSchema.safeParse("ñ".repeat(37)).success).toBe(false);
  });

  it("still lets sign-in accept a long legacy password (PasswordSchema)", () => {
    expect(PasswordSchema.safeParse("a".repeat(150)).success).toBe(true);
  });

  it("keeps the 8-character floor", () => {
    expect(NewPasswordSchema.safeParse("short1").success).toBe(false);
  });
});
