import { afterEach, describe, expect, it, vi } from "vitest";
import { logAuthFailure } from "./authDiagnostics";

afterEach(() => vi.restoreAllMocks());

describe("redacted auth diagnostics", () => {
  it("logs a structured auth type and nested database code without private details", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    logAuthFailure({
      type: "AdapterError", message: "private-user@example.test", stack: "private stack",
      cause: { err: { message: "private SQL", cause: { code: "ER_BAD_FIELD_ERROR", sql: "private query" } } },
    });
    const line = output.mock.calls[0][0] as string;
    const entry = JSON.parse(line);
    expect(entry.level).toBe("ERROR");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.parse(entry.message)).toEqual({ event: "auth.failure", type: "AdapterError", code: "ER_BAD_FIELD_ERROR" });
    expect(line).not.toContain("private");
  });

  it("never includes unknown types, arbitrary error codes or request data", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    logAuthFailure({ type: "sensitive-type", code: "sensitive-code", url: "sensitive-url", token: "sensitive-value" });
    expect(output.mock.calls[0][0]).not.toContain("sensitive");
    expect(JSON.parse(JSON.parse(output.mock.calls[0][0] as string).message)).toEqual({
      event: "auth.failure", type: "UnknownAuthError", code: "UNCLASSIFIED",
    });
  });

  it("bounds circular causes and handles missing errors", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const error: { cause?: unknown; type: string } = { type: "OAuthSignInError" };
    error.cause = error;
    logAuthFailure(error);
    logAuthFailure(null);
    expect(output).toHaveBeenCalledTimes(2);
    expect(output.mock.calls.every(([line]) => JSON.parse(JSON.parse(line as string).message).code === "UNCLASSIFIED")).toBe(true);
  });

  it("retains an allowlisted OAuth rejection but never the response description", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    logAuthFailure({ type: "OAuthCallbackError", cause: { err: {
      code: "OAUTH_RESPONSE_BODY_ERROR", cause: { body: { error: "invalid_client", error_description: "private description" } },
    } } });
    const line = output.mock.calls[0][0] as string;
    expect(JSON.parse(JSON.parse(line).message)).toEqual({
      event: "auth.failure", type: "OAuthCallbackError", code: "OAUTH_RESPONSE_BODY_ERROR", oauthError: "invalid_client",
    });
    expect(line).not.toContain("private");
  });
});
