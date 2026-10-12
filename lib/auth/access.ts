/** Account-first entry; public information and emergency help remain reachable. */
export function requiresAccount(env: Record<string, string | undefined>): boolean {
  return env.AUTH_REQUIRE_ACCOUNT !== "false";
}

export function isPublicAppPath(pathname: string): boolean {
  return /^\/(?:cuenta(?:\/|$)|semana(?:\/|$)|guias(?:\/|$)|privacidad$|terminos$|borrar-cuenta$|preguntas$|emergencia$|directorio$|eventos$|recomendados$)/.test(pathname);
}

/** Redirects accept local app routes only, never URLs or API paths. */
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 1200 || !raw.startsWith("/") || raw.startsWith("//") || /[\\\r\n]/.test(raw)) return "/";
  try {
    const url = new URL(raw, "https://mibebe.invalid");
    if (url.origin !== "https://mibebe.invalid" || /%2f|%5c/i.test(url.pathname)) return "/";
    if (/[\u0000-\u001f\u007f\\]/.test(decodeURIComponent(url.pathname))) return "/";
    if (!/^\/(?:$|herramientas(?:\/|$)|derechos$|familia$|ajustes$|progreso$|planeando(?:\/|$)|semana(?:\/|$)|guias(?:\/|$)|emergencia$|directorio$|eventos$|recomendados$|preguntas$)/.test(url.pathname)) return "/";
    // Personal dates are never carried through OAuth request URLs.
    for (const key of ["fum", "fpp"]) url.searchParams.delete(key);
    url.hash = "";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

/** Home finishes or restores onboarding before opening a requested tool. */
export function signInDestination(raw: unknown): string {
  const destination = safeReturnTo(raw);
  return destination === "/" ? "/" : `/?continue=${encodeURIComponent(destination)}`;
}
