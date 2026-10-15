# Bundled Nunito Sans

These are the same Google Fonts WOFF2 subset files used by the successful local Next15.5.25 build on12October2026. That build's emitted CSS used each subset at weights400/600/700/800/900. Bundling them removes the remote Google CSS/font fetch at build time that failed in Hostinger Next15.5.27's google loader (null font-file extension match).

- nunito-sans-latin.woff2: source68180864d7f93f02-s.p.woff2.
- nunito-sans-latin-ext.woff2: source357067f10075d686-s.woff2; includes Guaraní-adjacent Latin accents and ₲.
- nunito-sans-vietnamese.woff2: sourcee850464f9dfbb75b-s.woff2; includes ẽ and combining tilde used in g̃.

app/fonts.css preserves the emitted Unicode ranges and font-swap behavior; body keeps --font-nunito and system fallbacks. Only the critical Latin subset is preloaded. Font files are served from the app origin and cached by the existing runtime font-cache rule. License: SIL Open Font License1.1, included from the partner website's Nunito Sans license. No font generation, dependency upgrade, schema or credential change.