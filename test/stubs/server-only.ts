// Test stub for the `server-only` package (see vitest.config.mts).
//
// The real package throws on import outside a React Server Component, which is
// exactly what we want in the app: a client component importing lib/server/*
// fails the build. In unit tests there is no RSC boundary, so importing it
// would make every server module untestable. This no-op stands in.
export {};
