# Delta — Distribution & Signing Runbook

How to ship a packaged build of Delta. Covers the local-only path (unsigned
`.dmg` for testing) and the public-release path (notarized `.dmg` you can
hand to anyone).

## What `pnpm delta:make` produces

Running:

```bash
pnpm delta:make
```

…runs `electron-vite build` (compiles main + preload + renderer into
`out/`) followed by `electron-builder` (packages `out/` into the
distributables configured in `apps/browser/package.json`'s `build` block).

Outputs land in `apps/browser/release/`:

| Platform | Files |
| --- | --- |
| macOS | `Delta-<ver>-arm64.dmg`, `Delta-<ver>-x64.dmg`, plus matching `.zip`s used by future auto-update |
| Windows | `Delta Setup <ver>.exe` (NSIS, both x64 and arm64) |
| Linux | `Delta-<ver>.AppImage`, `delta_<ver>_amd64.deb` |

`release/` is gitignored — built artifacts never go into the repo.

## Local (unsigned) build — verify the pipeline

For day-to-day testing on your own machine:

```bash
# from repo root
pnpm install
pnpm delta:make
```

The first run downloads the Electron + Squirrel + AppImage tooling; expect
~5 minutes. Subsequent builds are ~30 s.

The resulting `.dmg` will install and run **on your machine** but Gatekeeper
will block it from running on anyone else's machine. That's expected for
unsigned builds.

If `delta:make` fails with an Apple-signing error and you don't intend to
sign yet, run with auto-discovery off:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm delta:make
```

This produces an *ad-hoc-signed* build — same Gatekeeper behaviour as
unsigned (Mac will refuse to launch it for non-developers), but the
build itself succeeds.

## Public-release build — notarized macOS

To ship a `.dmg` users can download and run, you need three things from
Apple:

1. **Apple Developer Program membership** ($99/yr) — gives you access to
   Developer ID certificates.
2. **A Developer ID Application certificate** — installed in your
   Keychain. This is what signs the `.app` bundle.
3. **An app-specific password** for `notarytool` — created at
   <https://appleid.apple.com/account/manage> under "App-Specific Passwords".

### One-time setup

1. In Xcode → Settings → Accounts → your Apple ID → Manage Certificates
   → click **+** → **Developer ID Application**. The cert lives in
   your login keychain.
2. Find your Team ID at <https://developer.apple.com/account>. It's the
   10-character string next to your team name.
3. Create the app-specific password (above). Save it somewhere safe;
   you can't view it again.

### Per-build environment

Set these before `pnpm delta:make`:

```bash
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"   # the app-specific one
export APPLE_TEAM_ID="ABCDE12345"
```

And in `apps/browser/package.json` flip the `build.mac.notarize` field
from `false` to `true` (or set it to a config object — see the
[electron-builder docs](https://www.electron.build/configuration/mac.html#MacConfiguration-notarize)).

Then:

```bash
pnpm delta:make
```

The build will:

1. Sign the `.app` with your Developer ID cert (auto-discovered from
   Keychain).
2. Upload the `.app` to Apple's notarytool, wait for the staple, attach
   the notarization ticket back to the `.dmg`.

Notarization typically takes 1–10 minutes. The CLI streams progress.

### Verification

After the build, sanity check:

```bash
codesign -dv --verbose=4 release/mac-arm64/Delta.app
spctl -a -vvv release/mac-arm64/Delta.app
```

You want to see `accepted` and `source=Notarized Developer ID`.

## Linux build

```bash
pnpm delta:make --linux
```

Produces an AppImage and a `.deb`. No signing required for AppImage;
the `.deb` is unsigned by default but acceptable for direct distribution.

## Windows build

```bash
pnpm delta:make --win
```

Produces an NSIS installer. For SmartScreen to *not* flag the installer
as "unrecognised app", you'd need an EV code-signing cert (~$300/yr from
Sectigo / DigiCert). Skip that until there's a real reason.

## Auto-update — future

The `build.publish` field is set to `null` for now (no auto-update). When
you're ready:

1. Switch publish to `{ "provider": "github", "owner": "Delta-Practice",
   "repo": "Browser" }`.
2. Use `electron-updater` from main; it pulls from GitHub Releases.
3. Tag a release: `git tag v0.1.0 && git push --tags` triggers the
   GitHub Action (TBD) that calls `pnpm delta:make` and uploads the
   artifacts.

That's documented in `apps/browser/docs/identity.md` §5 — "auto-update is
the one legitimate outbound call." Make sure the toggle to disable
auto-update is wired before flipping any of this on.

## What I (the engineer/agent) cannot do for you

- **Sign with your cert.** The cert lives in your Keychain. I can't
  enrol you in Apple Developer or create credentials.
- **Notarize.** Same — needs your Apple ID + app-specific password.
- **Push to GitHub Releases.** Needs your push permission to the repo.

Everything else (the build config, entitlements, target platforms, NSIS
setup, runbook above) is in the repo. Once you've got the cert, two env
vars and a config flip away from a public release.
