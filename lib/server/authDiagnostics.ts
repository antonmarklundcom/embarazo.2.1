import "server-only";

const AUTH_ERRORS = new Set([
  "AuthError", "AdapterError", "AccessDenied", "CallbackRouteError", "ErrorPageLoop",
  "EventError", "InvalidCallbackUrl", "CredentialsSignin", "InvalidEndpoints", "InvalidCheck",
  "JWTSessionError", "MissingAdapter", "MissingAdapterMethods", "MissingAuthorize", "MissingSecret",
  "OAuthAccountNotLinked", "OAuthCallbackError", "OAuthProfileParseError", "SessionTokenError",
  "OAuthSignInError", "EmailSignInError", "SignOutError", "UnknownAction", "UnsupportedStrategy",
  "InvalidProvider", "UntrustedHost", "Verification", "MissingCSRF", "AccountNotLinked",
]);

const CAUSE_CODES = new Set([
  "ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR", "ER_PARSE_ERROR", "ER_DUP_ENTRY", "ER_CON_COUNT_ERROR", "ER_TOO_MANY_USER_CONNECTIONS",
  "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "PROTOCOL_CONNECTION_LOST",
  "ERR_TLS_CERT_ALTNAME_INVALID", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT",
  "OAUTH_INVALID_RESPONSE", "OAUTH_RESPONSE_IS_NOT_CONFORM", "OAUTH_RESPONSE_BODY_ERROR",
  "OAUTH_AUTHORIZATION_RESPONSE_ERROR", "ERR_JWT_EXPIRED", "ERR_JWE_DECRYPTION_FAILED",
]);

const OAUTH_ERRORS = new Set([
  "invalid_client", "invalid_grant", "unauthorized_client", "redirect_uri_mismatch",
  "access_denied", "invalid_request", "temporarily_unavailable", "server_error",
]);

function causeValue(error: unknown, field: "code" | "error", allowed: Set<string>, depth = 0): string | undefined {
  if (!error || typeof error !== "object" || depth > 5) return undefined;
  const fields = error as { code?: unknown; error?: unknown; cause?: unknown; err?: unknown; body?: unknown };
  const value = fields[field];
  if (typeof value === "string" && allowed.has(value)) return value;
  return causeValue(fields.cause, field, allowed, depth + 1)
    ?? causeValue(fields.err, field, allowed, depth + 1)
    ?? causeValue(fields.body, field, allowed, depth + 1);
}

export function logAuthFailure(error: unknown): void {
  const type = error && typeof error === "object" && "type" in error ? error.type : undefined;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "ERROR",
    message: JSON.stringify({
      event: "auth.failure",
      type: typeof type === "string" && AUTH_ERRORS.has(type) ? type : "UnknownAuthError",
      code: causeValue(error, "code", CAUSE_CODES) ?? "UNCLASSIFIED",
      oauthError: causeValue(error, "error", OAUTH_ERRORS),
    }),
  }));
}
