import { describe, expect, it } from "vitest";
import {
  QUESTION_MAX,
  QUESTION_MIN,
  questionSchema,
} from "@/lib/community/questions";
import {
  departmentSlugSchema,
  isoDateSchema,
  paraguayPhoneSchema,
  slugSchema,
} from "@/lib/content/schemas";

// The zod messages that reach a human, pinned.
//
// Added by the zod 3→4 migration (PR-14). The reason it exists: zod's *default*
// messages are English, they are rewritten between majors, and one of them is
// rendered verbatim to a pregnant woman in a Spanish-language app.
// `/api/v1/mis-preguntas` answers a bad body with
// `parsed.error.issues[0]?.message`, and `components/CommunityQuestions.tsx`
// does `setError(body.error)` — so the string zod picks IS the UI copy.
//
// zod 4 changed every default: "Required" became "Invalid input: expected
// string, received undefined", "String must contain at least 15 character(s)"
// became "Too small: expected string to have >=15 characters", and the issue
// codes `invalid_string`/`invalid_enum_value` became
// `invalid_format`/`invalid_value`. None of that broke a test, because until
// now nothing asserted on a message. That is the silent failure this file is
// here to make loud: the whole test suite stayed green while the copy shown to
// a user was free to change under us.
//
// So the rule is not "these codes" — codes are zod's to rename. The rule is
// **a message a user can see is ours, written in Spanish, and does not come
// from zod's default catalogue.**

/**
 * zod's own default messages, across v3 and v4. A message matching any of
 * these is zod talking, not us — which on a user-facing surface is a bug
 * regardless of which major produced it.
 */
const ZOD_DEFAULT_MESSAGE =
  /^(Required$|Invalid input|Invalid option|Invalid enum value|Too small|Too big|String must contain|Number must be|Expected \w+, received|Unrecognized key)/;

describe("questionSchema — the messages a user actually reads", () => {
  // The realistic failures. A woman typing into the box can produce these two
  // and essentially nothing else; the type failures below are a malformed
  // client, not a person.
  it("says, in Spanish, that a short question is too short", () => {
    const result = questionSchema.safeParse("ayuda");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(
      `Contanos un poco más (al menos ${QUESTION_MIN} caracteres).`,
    );
  });

  it("says, in Spanish, that a long question is too long", () => {
    const result = questionSchema.safeParse("x".repeat(QUESTION_MAX + 1));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(
      `Es muy largo — resumilo en ${QUESTION_MAX} caracteres.`,
    );
  });

  it("still measures length after trimming", () => {
    // `.trim()` runs before `.min()`, so whitespace padding is not a way to
    // get an unanswerable question past the floor.
    const result = questionSchema.safeParse(`   ${"a".repeat(5)}   `);
    expect(result.success).toBe(false);
  });

  // The route hands `issues[0]` to the UI, so it is specifically the FIRST
  // issue that has to be ours. zod 4 reports more issues than zod 3 did for
  // some inputs (a non-string also trips the length check), which makes the
  // ordering load-bearing in a way it was not before.
  it("puts our own message first, for every input a user can produce", () => {
    for (const input of ["", "   ", "ayuda", "x".repeat(QUESTION_MAX + 1)]) {
      const result = questionSchema.safeParse(input);
      expect(result.success, JSON.stringify(input)).toBe(false);
      if (result.success) continue;
      const first = result.error.issues[0]?.message ?? "";
      expect(first, JSON.stringify(input)).not.toMatch(ZOD_DEFAULT_MESSAGE);
    }
  });
});

describe("content schemas keep their hand-written Spanish", () => {
  // These surface through `formatContentIssues` into the build log and into
  // /admin/contenido. They are not user-facing, but they are the sentences
  // that tell whoever is entering directory data what they got wrong, and a
  // zod major silently replacing them with English is the same class of
  // regression.
  const cases: [string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, unknown][] = [
    ["slugSchema", slugSchema, "Foo Bar"],
    ["paraguayPhoneSchema", paraguayPhoneSchema, "0981234567"],
    ["departmentSlugSchema", departmentSlugSchema, "narnia"],
    ["isoDateSchema", isoDateSchema, "26-01-01"],
  ];

  for (const [label, schema, badInput] of cases) {
    it(`${label} explains the failure in Spanish`, () => {
      const result = schema.safeParse(badInput);
      expect(result.success).toBe(false);
      if (result.success) return;
      const message = result.error?.issues[0]?.message ?? "";
      expect(message).not.toMatch(ZOD_DEFAULT_MESSAGE);
      expect(message.length).toBeGreaterThan(10);
    });
  }
});
