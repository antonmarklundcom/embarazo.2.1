import { config } from "zod";

// V1 — turn off zod's JIT compilation, app-wide.
//
// Zod 4 compiles a schema into a specialised validator the first time it
// parses, and it decides whether it may do that by *trying* it:
// `try { Function(""); return true } catch { return false }`. Under an
// enforcing `script-src` without `'unsafe-eval'` that call throws, zod
// catches it and falls back to its interpreter — so nothing breaks — but the
// attempt still fires a `securitypolicyviolation` event and logs a CSP error
// in the console, on every page that parses anything, for every user.
//
// That is worse than it sounds. It is the noise that makes a real violation
// invisible: a policy whose console is already full of one expected error is
// a policy nobody reads. It would also be the bulk of the traffic to any
// `report-uri` we ever add.
//
// `jitless: true` is zod's own answer to this — its docstring says "Useful in
// environments that disallow `eval`", which is now every environment this app
// runs in. The cost is that validation runs interpreted. This app parses small
// objects (a sync envelope, an onboarding step, a question form), never
// anything in a hot loop, and it was already running interpreted in every
// browser since the policy went enforcing. This just stops it from asking.
//
// Guarded on the browser, because the server has no CSP and no reason to give
// up the compiled path: there, `eval` is available and a sync push is the one
// place in this app where validation volume is worth anything.
//
// Imported for its side effect by every module that builds a schema the
// browser can reach. An import is evaluated before the body of the module that
// imports it, so the config is set before any of those schemas is constructed
// and long before anything parses.
if (typeof window !== "undefined") {
  config({ jitless: true });
}
