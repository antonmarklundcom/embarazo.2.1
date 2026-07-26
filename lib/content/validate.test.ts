import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_FILES } from "./schema";

// Content validation (BUILD-PLAN G1). Run on its own with
// `npm run validate:content`, and as part of `npm test` in CI.
//
// Implemented as a test rather than a standalone script on purpose: a script
// would need its own TypeScript loader to import the schemas, which is one
// more fragile moving part between the founder and a green build. This way the
// same command that checks the code checks the content.
//
// Failure messages are written in Spanish and name the file, the entry number
// and the field, so whoever wrote the content can fix it without reading any
// TypeScript.

const CONTENT_DIR = path.resolve(__dirname, "../../content");

function describePath(segments: (string | number)[]): string {
  if (segments.length === 0) return "(raíz del archivo)";
  const [index, ...rest] = segments;
  const entry = typeof index === "number" ? `entrada #${index + 1}` : index;
  return rest.length ? `${entry} → ${rest.join(" → ")}` : String(entry);
}

describe("content files", () => {
  for (const { file, schema, label } of CONTENT_FILES) {
    describe(`${label} (content/${file})`, () => {
      const full = path.join(CONTENT_DIR, file);

      it("existe y es JSON válido", () => {
        expect(() => readFileSync(full, "utf8"), `Falta content/${file}`).not.toThrow();
        expect(
          () => JSON.parse(readFileSync(full, "utf8")),
          `El JSON de content/${file} está mal formado. Suele ser una coma de más al final de una lista, o comillas sin cerrar.`,
        ).not.toThrow();
      });

      it("cumple el formato de docs/CONTENT-GUIDE.md", () => {
        const parsed = JSON.parse(readFileSync(full, "utf8"));
        const result = schema.safeParse(parsed);

        if (!result.success) {
          const report = result.error.issues
            .map((issue) => `  • ${describePath(issue.path)}: ${issue.message}`)
            .join("\n");
          throw new Error(
            `content/${file} tiene ${result.error.issues.length} problema(s):\n${report}\n\n` +
              "El formato está explicado en docs/CONTENT-GUIDE.md.",
          );
        }

        expect(result.success).toBe(true);
      });
    });
  }
});
