# Android wrapper (Google Play)

The Play app is a Trusted Web Activity: a thin Android shell around
`https://app.embarazo.com.py`. Only `twa-manifest.json` lives in git. Everything
Bubblewrap generates is rebuilt from it, and the signing key never goes in git.
Full background: `docs/ANDROID-LAUNCH.md`. Step-by-step submission:
`docs/PLAY-STORE-SUBMISSION.md`.

## Build the .aab (on your own computer)

Needs Node 22+. The first `bubblewrap` run offers to download a JDK and the
Android SDK; say yes.

```bash
npm i -g @bubblewrap/cli
```

```bash
cd android
```

```bash
bubblewrap update --manifest=./twa-manifest.json
```

The first time, there is no `android.keystore` yet. Create it once, with the
alias `mibebe`:

```bash
keytool -genkeypair -v -keystore android.keystore -alias mibebe -keyalg RSA -keysize 2048 -validity 10000
```

Save the keystore file and both passwords in your password manager and an
offline backup. With Play App Signing, a lost upload key can be reset through
Play support, but it takes days.

```bash
bubblewrap build
```

Upload `app-release-bundle.aab` to Play Console. Install
`app-release-signed.apk` on a phone to test first.

## Before every upload

1. Open the generated `app/build.gradle` and confirm `targetSdkVersion` is
   **36** or higher (Play's rule since 31 August 2026). If it is lower, update
   Bubblewrap and run `bubblewrap update` again.
2. Raise `appVersionCode` in `twa-manifest.json` by one. Play refuses a code it
   has already seen.
3. Keep the colours and names equal to `app/manifest.webmanifest`.
   `lib/twaManifest.test.ts` fails if they drift.

## Digital Asset Links (no URL bar)

Get both SHA-256 fingerprints:

- Upload key: `keytool -list -v -keystore android.keystore -alias mibebe`
- Play signing key: Play Console → Test and release → Setup → App integrity →
  App signing key certificate (it appears after the first upload).

In Hostinger set:

```
TWA_PACKAGE_NAME=py.com.embarazo.app
TWA_SHA256_FINGERPRINTS=<upload SHA-256>,<Play signing SHA-256>
```

Then check `https://app.embarazo.com.py/.well-known/assetlinks.json` shows both,
install the app from the Play internal-testing link, and confirm there is no
browser URL bar at the top.
