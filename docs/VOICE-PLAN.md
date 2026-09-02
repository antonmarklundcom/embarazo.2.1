# Read-aloud plan — Spanish now, Guaraní later

> Status: approved by the founder 2026-09-02, not yet built. This is the spec a
> build session executes; it names the phases, the model lane per phase, the
> data-contract position, and the exit criteria. Read `DECISIONS.md` and
> `docs/ARCHITECTURE.md` §4 first — nothing here changes the data contract.

## 1. The short answer to "will it work in the app, online and offline?"

| | Spanish | Guaraní |
|---|---|---|
| **Engine** | The phone's own text-to-speech through the browser (`speechSynthesis`). Chrome/TWA on Android uses the Google speech engine; Safari on iOS uses the Siri voices. | No phone has a Guaraní voice. We ship **pre-rendered audio files** generated at build time from the founder's own Guaraní voice model. |
| **Online** | Works. | Works; files stream from the app origin. |
| **Offline** | Works **if the Spanish voice pack is installed on the phone**. Most Androids sold in Paraguay ship Spanish voice data; when it is missing the app detects it and shows a one-line hint on how to install it. | Works for whatever has been cached: the emergency set is precached by the service worker at install; the rest is cached on first play or by a "download all audio" switch in Ajustes. |
| **Quality** | Latin-American Spanish voices (`es-US`, `es-419`, `es-AR`, `es-MX`). There is no `es-PY` voice anywhere; the voice picker ranks the closest one first. | Whatever the founder's model produces. Register must be jopara, matching the reviewed strings. |
| **Screen off** | Stops when the phone locks. This is a browser limitation on `speechSynthesis`; the UI says "con la pantalla encendida". | Keeps playing: it is an `<audio>` element with Media Session metadata (lock-screen controls). |
| **Cost** | Zero. No server, no API. | Zero at runtime. One build-time render per string per voice version. |
| **Privacy** | Nothing leaves the phone. The text is already on the device. | Audio files are public static assets; no request carries user data. |

Both go through one `Speaker` abstraction so a page never knows which engine
is behind it, and so Spanish can later be switched to pre-rendered audio too
(for lock-screen playback or a consistent voice) without touching the pages.

## 2. Architecture

```
lib/speech/
  types.ts          SpeechSource = { kind: "tts", lang, text } | { kind: "audio", lang, key }
  chunk.ts          splitForSpeech(text): string[]   — sentence-aware, ≤ 220 chars per chunk
  voices.ts         pickVoice(lang, voices): SpeechSynthesisVoice | null — ranked preference list
  tts.ts            speakChunks(chunks, voice, rate, handlers) — queue, cancel, pause/resume
  audio.ts          playAudio(key, handlers) — <audio> + MediaSession, resolves file via manifest
  manifest.ts       loads public/audio/manifest.json (built), maps (lang, textHash) → file + duration
  hash.ts           speechKey(lang, text, voiceVersion) → sha256 hex (same function in the build script)
  useSpeaker.ts     React hook: state machine idle → loading → playing → paused → done | error
components/ReadAloudButton.tsx   the only UI; props { text, lang, label? , audioKey? }
scripts/gen-audio.mts            build-time renderer for pre-rendered languages (Guaraní first)
public/audio/<lang>/<hash>.m4a   rendered files (AAC 48 kbps mono, universal on Chrome + Safari)
public/audio/manifest.json       { version, entries: { [key]: { file, seconds, bytes } } }
```

Resolution order in `useSpeaker` for a `SpeechSource`:

1. If the manifest has an entry for `speechKey(lang, text)` → play the file (`audio.ts`).
2. Else if `speechSynthesis` exists and `pickVoice(lang)` finds a voice → speak (`tts.ts`).
3. Else → the button renders **hidden** (not disabled): no dead controls on a health screen.

Guaraní therefore always takes path 1 or 3; Spanish takes 2 today and can take 1 later.

### 2.1 Spanish voice selection (`voices.ts`)

- Voices load asynchronously: read `getVoices()` and also listen for
  `voiceschanged`; resolve on whichever fires with a non-empty list, with a
  1.5 s timeout to the "no voice" state.
- Preference order for `lang = "es"`: `es-PY` (future-proof, does not exist
  today), `es-US`, `es-419`, `es-AR`, `es-UY`, `es-MX`, `es-CO`, `es-ES`, then
  any `es-*`. Within a language, prefer `localService === true` (offline
  capable), then a name containing "Google" or "Siri", then the first.
- Persist the user's chosen voice URI and rate in `localStorage` under
  `speech.voiceURI` / `speech.rate`. Default rate 0.95 (slightly slower reads
  better for medical text). No pitch change.
- Offline detection: if `!navigator.onLine` and the selected voice is not
  `localService`, show the hint "Para escuchar sin conexión, instalá la voz en
  español en Ajustes del teléfono → Idioma → Texto a voz" and still try to
  speak (some engines have cached data anyway).

### 2.2 Chunking and playback (`chunk.ts`, `tts.ts`)

- Chrome historically cuts utterances longer than ~15 s and Android engines
  drop long queues, so always speak sentence-sized chunks, ≤ 220 characters,
  split on `. ! ? :` and on paragraph breaks; never split inside a number
  ("semana 18" stays together).
- Strip HTML to text first for guides (the guide bodies are HTML in
  `lib/seed/articles.json`): keep list items as sentences, drop links' URLs,
  read `<strong>` as plain text.
- One global queue: starting a new read cancels the previous one
  (`speechSynthesis.cancel()`), so two buttons never talk over each other.
- Must start from a user gesture (both platforms enforce it). Never autoplay.
- Handle `onend`, `onerror`, and the Android quirk where `onend` does not fire
  after `pause()`: treat `speaking === false` polled at 250 ms as ended.
- Visibility: on `visibilitychange` to hidden, pause and remember position
  (chunk index); on return, offer "Seguir" rather than auto-resuming.

### 2.3 Pre-rendered audio (`audio.ts`, `scripts/gen-audio.mts`)

- Files are keyed by `sha256(lang + "\n" + voiceVersion + "\n" + text)`. A
  changed string or a new voice version produces a new file; the old one is
  garbage-collected by the script. The UI never guesses a file name.
- The script takes a **renderer adapter**: `TTS_GN_COMMAND` (a shell command
  that reads text on stdin and writes WAV to stdout) or `TTS_GN_ENDPOINT` (a
  POST that returns audio). The founder's Guaraní model plugs in as either.
  Missing env → the script skips that language and prints what would be
  rendered; the build never fails on missing audio (see §4).
- Encode with `ffmpeg -ac 1 -b:a 48k` to `.m4a` (AAC-LC). AAC plays natively
  in Chrome, Android WebView and Safari; Opus-in-WebM does not on iOS.
  Expect ~360 kB per minute of speech.
- `manifest.json` carries `seconds` and `bytes` so Ajustes can show
  "Descargar todos los audios (14 MB)" honestly.
- Playback uses a single shared `<audio>` element created on first gesture,
  `MediaSession` metadata (title = the string's label, artist = "Mi Bebé"), and
  `preload="none"`.

### 2.4 Offline strategy per language

| Set | Spanish | Guaraní |
|---|---|---|
| Emergency: nine alarm signs, the call script, "andá ahora" | device TTS | **precached** in `app/sw.ts` (add the manifest files for `lib/emergency.ts` strings to the precache list; ~1 MB) |
| Derechos headlines, cheers, dictionary strings | device TTS | runtime `CacheFirst` on first play |
| Weeks, guides, daily tip | device TTS | not translated yet; when they are, runtime cache + the Ajustes download switch |

The Ajustes switch "Audios sin conexión" fetches every manifest file into the
same runtime cache and shows progress; it is off by default because of data
cost, and it says the size before starting.

## 3. Where the button appears

| Surface | Source | Notes |
|---|---|---|
| `/semana/[n]` | milestone + tip, Spanish | One button at the top of the week card: "Escuchar esta semana". |
| `/guias/[slug]` | full body, Spanish | Button under the title; progress shown as "párrafo 3 de 12". |
| Home daily tip | tip text, Spanish | Small icon button. |
| `/emergencia` | each alarm sign, Spanish **and** Guaraní | Two icon buttons per sign, labelled "Escuchar" / "Ehendu". Guaraní hidden until its audio exists in the manifest. |
| `/derechos` | headline per right, Spanish and Guaraní | Same pattern. |
| Marketing site (`embarazo.com.py`) | week and article pages, Spanish | The same `lib/speech` files are copied into the site repo; static site, no manifest needed for Spanish. |

Copy: the button says "Escuchar", the playing state "Pausar", and the empty
state is hidden. Guaraní labels use `lang="gn"`.

## 4. Gates and tests

- **Build never fails for missing audio.** A missing Guaraní file only hides
  that button. `scripts/validate-content.mts` gains a warning line per
  Guaraní string without audio; `/admin/contenido` shows the count as a new
  review-debt row ("audios guaraní: 12 de 78").
- **Audio is not a data-contract change.** No new API, no new sync store, no
  new table. The pinned-list tests (`allowlist.test.ts`, `schema.test.ts`)
  must stay untouched; if a session finds it needs to touch them, it stops.
- Unit tests: `chunk.test.ts` (never splits numbers, respects the length cap,
  handles HTML), `voices.test.ts` (ranking with fake voice lists including an
  empty list and a Spain-only list), `hash.test.ts` (same key from the script
  and the app), `manifest.test.ts` (resolution order 1→2→3).
- E2E: stub `window.speechSynthesis` in Playwright, assert the button on
  `/semana/18` speaks the milestone as the first chunk, that a second button
  cancels the first, and that with no voices the button is absent.
- Accessibility: `aria-pressed`, visible focus ring, label announces state.

## 5. Phases and model lanes

| Phase | Model | Scope | Exit |
|---|---|---|---|
| **V1 Spanish read-aloud** | Sonnet | `lib/speech/*` minus `audio.ts`, `ReadAloudButton`, voice + rate setting in Ajustes, placement on weeks, guides, tip, emergencia, derechos (Spanish only). Tests in §4. | Build green, tests green, Lighthouse a11y unchanged, e2e above passes, DECISIONS.md entry. |
| **V2 Guaraní pre-rendered pipeline** | Opus | `scripts/gen-audio.mts` with the adapter, manifest, `audio.ts` + MediaSession, service-worker precache of the emergency set, Ajustes download switch, review-debt row, Guaraní buttons on emergencia and derechos. Ships with **zero rendered files** if the founder's voice is not ready; everything stays hidden. | Script renders a fixture language end to end in CI using a stub command; precache list test; manifest resolution tests; hidden-state e2e. |
| **V3 later options** | decide then | (a) pre-render Spanish too, for lock-screen playback and one consistent voice; (b) on-device neural TTS in the browser (WASM) for arbitrary Guaraní text once the model is small enough (20–60 MB is too much for this audience today); (c) "Semana en audio" share to WhatsApp as a voice note. | — |

V1 has no dependency on V2. V2 depends on V1's abstraction, not on the voice
being ready.

## 6. Founder inputs

- The Guaraní voice: a command or endpoint that turns text into WAV, and a
  `voiceVersion` string to bump when the model changes.
- Native-speaker review of the 78 Guaraní strings **before** rendering them
  (`docs/GUARANI-REVIEW.md`); re-render after corrections is one command.
- A decision on whether long-form Guaraní (weeks, guides) will ever be
  translated; until then the audio scope is the 78 reviewed strings.
