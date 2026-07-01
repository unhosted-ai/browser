# Unhosted Browser — Identity & Profiles

Status: **draft**, pre-implementation. Captures the design before we build it
so we don't bake a cloud account into the architecture by accident.

## 0. The principle

> "Login is for personalisation. Nothing goes anywhere except this device."

Unhosted Browser has no server. There is no "Unhosted Browser account" to sign into. What the user
calls a "login" is a **local profile** — a personalised state container
that lives on the user's machine, gated by the OS's existing authentication
(macOS login → optional Touch ID, Windows login → optional Hello, etc.).

This is the Chrome "profile" model, but with one rule: **no profile state
ever leaves the device unless the user explicitly turns on encrypted sync
(future, opt-in).**

## 1. What a profile contains

A profile is a directory under `userData/profiles/<profileId>/`:

```
~/Library/Application Support/Unhosted Browser/
  profiles/
    default/
      settings.json          # theme, default provider, sensitive-site list
      keys/                  # safeStorage-encrypted secrets (API keys, etc.)
      tabs.json              # last-session tab state
      history.sqlite         # browsing history (future)
      bookmarks.json         # (future)
      conversations/         # persisted agent tasks (future)
        <taskId>.json
      passwords.sqlite       # password vault (future)
    work/
      ...
    research/
      ...
  shared/
    extensions/              # (future) loaded once, available to all profiles
    cache/                   # Chromium caches — separable per profile via session.fromPartition
```

Each profile is a self-contained personalisation unit. Switching profiles is
indistinguishable from "logging out and logging in as someone else" — but
nothing transits a network.

## 2. Profile picker — the launch surface

Three states at app boot:

1. **No profiles yet** — first launch. Boot directly into a `default`
   profile, no picker. The user never sees the concept of profiles unless
   they choose to.
2. **One profile** (the common case for solo users) — boot into it
   silently. No interruption.
3. **Multiple profiles** — show a picker before the main window opens.
   Each profile shows a name, an avatar/colour, and last-active date.
   Clicking selects + boots. There's a Settings → Profiles panel for
   manage/rename/delete.

Profiles can optionally be **gated by Touch ID / Windows Hello / Linux
PAM** — the OS prompts; Unhosted Browser never asks for a master password. (We
piggyback on the same biometric/auth path the password vault uses.)

## 3. Process model

A profile choice is a **launch-time decision**, not a runtime swap.
Switching profiles relaunches the app with the new profile root. This
keeps the architecture simple and avoids cross-profile leaks via long-lived
in-memory state (cookies, session caches, in-flight agent tasks).

```
electron main
  args: --profile=<id>
  ↓
  profilePath = userData/profiles/<id>/
  ↓
  SettingsStore.fromProfile(profilePath)
  Agent.fromProfile(profilePath)
  TabManager.fromProfile(profilePath)
  session.fromPartition("persist:" + id)   // separate cookies/cache per profile
  ↓
  createWindow()
```

The `session.fromPartition` line is the one that matters most:
WebContentsView per-tab isolation already exists; this scopes the entire
session — cookies, localStorage, cache — to the profile, so logging into
gmail in profile A doesn't auto-log-you-in in profile B.

## 4. What "personalisation" actually unlocks

Now that profiles exist, the things you couldn't do before because they'd
imply a cross-cutting "user" all become safe:

- **Persistent agent conversations.** Per-profile chat history. You can
  return to yesterday's conversation without it bleeding into a different
  profile.
- **Bookmarks, history, downloads.** Standard browser surfaces. None of it
  moves off the machine.
- **Password vault.** Per-profile, since two humans sharing a laptop
  shouldn't share saved logins.
- **Recently-used providers + models.** The model picker remembers what
  you've actually used.
- **Pinned tabs / workspaces.** "Research mode" and "Work mode" become two
  profiles instead of one tangled tab strip.
- **Per-profile sensitive-site list.** A profile dedicated to banking can
  block agent tools across the board; a research profile can be more
  permissive.

None of this needs a server.

## 5. Auto-update — the one legitimate outbound call

The app itself needs to know when there's a new version. This is the only
remote call Unhosted Browser makes by default that isn't user-initiated, and it has
to be done transparently:

| Property | Choice |
| --- | --- |
| Where | `https://updates.delta-browser.app/` (placeholder) — a static manifest, not a server |
| How often | Once on launch, then every 24h while running |
| What gets sent | `User-Agent: Unhosted Browser/<version> (<platform>)` — nothing else. No telemetry, no machine ID, no profile ID |
| What gets returned | A signed JSON manifest: latest version, release notes URL, signed installer URL |
| Verification | All updates are code-signed; Unhosted Browser verifies the signature before applying |
| Off switch | Settings → Updates → "Check for updates automatically" toggle. Disabling stops both the check and the install. |

The opt-out has to be visible. If a privacy-first browser checks home for
updates, the user has the right to know exactly what's leaving their
machine and to turn it off.

## 6. Sync — explicitly out of scope for v1, but designed-around

Sync between devices is the obvious "but I have a phone" follow-up. We
don't ship it in v1, but the design above doesn't preclude it:

- A future `Sync` profile setting would pair two devices via QR-code
  exchange (similar to Signal's safety-number model). The QR encodes a
  shared secret used to derive an end-to-end encryption key.
- Profile state is serialised, encrypted with that key, uploaded to a
  blind store (or a peer-to-peer link), and pulled by the other device.
- The server (if any) only sees opaque ciphertext. It cannot enumerate
  users, profiles, or content.
- Sync is a **per-profile toggle**, not a global Unhosted Browser setting.

Bitwarden, Signal, and Standard Notes all ship variants of this
architecture. We don't have to invent it.

## 7. What this is *not*

- **Not** a Unhosted Browser account. There is no email/password to recover, because
  there is nothing on a server to recover.
- **Not** SSO. We don't sign you into Gmail or GitHub on your behalf —
  those signins live in their own cookies, scoped to the active profile.
- **Not** a sync mechanism. Profiles are local. Sync is a separate,
  optional, future feature.
- **Not** a master-password system. The OS authentication path
  (Touch ID / Hello / PAM) is the master key. We are not in the
  business of asking users to remember another password.

## 8. Implementation order

When we build this, suggested order:

1. **Profile-rooted paths.** Refactor `SettingsStore`, `TabManager`, and
   future stores to take a `profileDir` arg instead of using
   `app.getPath("userData")` directly. No UI yet — single hard-coded
   `default` profile under the hood.
2. **Per-session partition.** Wire `session.fromPartition("persist:<id>")`
   so cookies + cache are profile-scoped from day one.
3. **Profile picker on launch.** Boot path branches based on
   `profiles/` directory contents. CLI flag `--profile=<name>` for
   power users.
4. **Settings → Profiles panel.** Create / rename / delete / Touch ID
   gate.
5. **Auto-update flow.** Standalone — doesn't depend on profiles. Ship
   with §5's transparency built in from the start.
6. **(Later)** Encrypted sync, per §6.

Each step ends in a state where the app still works end-to-end. The
default user (one human, one machine, doesn't care about profiles) never
sees a UI affordance for any of this — it's invisible until it's needed.
