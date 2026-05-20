# Side-by-side install — Delta OS on a pre-existing OS

_Not yet built. This doc captures the realistic options and the decisions you'd need to make before any code lands. The AI-OS / second-brain track (Skill 1 shipped, Skills 2-5 roadmap) is a separate thing — it lives **inside** Delta the browser. This doc is about Delta the **operating system** running **alongside** your existing OS._

## What "kernel-style install on a pre-existing OS" can mean

Four distinct shapes. Each has very different scope, blast radius, and target user. Pick one before building.

### Shape A — Dual boot

Delta-OS is a real Linux distribution that installs to its own partition. At boot the firmware (UEFI / BIOS) shows a menu: macOS / Windows / Delta-OS. The user picks. The other OS is untouched.

- **Pros:** real OS, full hardware access, runs at native speed, can be a daily driver.
- **Cons:** the user has to repartition (risky if they get it wrong), reboot to switch (slow context switch), and the installer has to know about UEFI Secure Boot + rEFInd / GRUB / Windows Boot Manager.
- **Implementation:** an installer ISO (Debian/Ubuntu/Arch base) that bundles Delta + a thin display manager. Build with `live-build` or `archiso`.
- **Honest target user:** anyone who already dual-boots Linux on a laptop. Niche.

### Shape B — Bootable USB ("try without installing")

Same Linux distro as Shape A but it boots from a USB stick. The user plugs in the stick, reboots, holds the boot-picker key, picks the USB, and is inside Delta-OS. No partition changes; pulling the stick + rebooting returns to the existing OS.

- **Pros:** zero risk to the existing OS. Reversible by literally pulling the USB. Great demo / "try it for an hour" path.
- **Cons:** slower than installed (USB I/O), no persistence by default (or persistent overlay file = brittle).
- **Implementation:** same ISO as Shape A, but `dd`'d to a USB stick. Add a "Persist my settings on the stick" toggle in Delta-OS that writes a `casper-rw` overlay.
- **Honest target user:** tire-kickers + presenters + people demoing Delta to friends.

### Shape C — VM image

Delta-OS ships as a `.vmdk` / `.qcow2` / `.ova` that runs inside the user's existing OS via UTM / VirtualBox / VMware / Parallels / QEMU. The user double-clicks the image; it boots Delta-OS in a window.

- **Pros:** fully isolated. No partitioning, no reboot. Easy to try.
- **Cons:** virtualised graphics → laggy. Not a daily driver. The "AI-OS" pitch loses something when the browser inside the VM is running on top of the user's actual browser session.
- **Implementation:** same Linux base, packaged as a pre-built VM image. Build with `packer` + a libvirt provider.
- **Honest target user:** developers + curious technical users.

### Shape D — Container / WSL-style ("kernel inside the kernel")

Delta-OS as a container or namespace inside the running OS. On Linux: a systemd-nspawn container or a Snap. On Windows: a WSL distribution. On macOS: a Docker / OrbStack container that exposes a Wayland socket to the host display.

- **Pros:** instant launch (no boot). Filesystem-isolated from the host. Theoretically updatable independently.
- **Cons:** graphics integration is brittle. Doesn't really feel like an OS — feels like a weird app. Defeats the point of "kernel-style" if it's a container running on the host kernel.
- **Implementation:** Dockerfile + `xpra` / Wayland-over-socket bridge.
- **Honest target user:** none, really. Pick A, B, or C instead.

## Recommended ordering

1. **Shape B first.** Build a bootable USB ISO. Smallest blast radius, highest learning-per-PR. Use Debian 12 LTS as the base; ship `delta-amd64.iso` + `delta-arm64.iso`. This is the original Option C from the early strategy draft.
2. **Shape C as a side-deliverable** once B works — a Packer recipe that takes the same ISO and produces a `.qcow2` for UTM / VirtualBox. Cheap once B exists.
3. **Shape A only if B has real adopters.** Dual-boot installer-ISOs are 5-10× the work of a live-USB ISO; don't spend that time speculatively.
4. **Skip Shape D.**

## What the bootable image needs to bundle

Beyond the existing Delta Electron app:

- A **Linux kernel + initramfs**. Pick a recent LTS — 6.6 today. ARM64 + AMD64.
- A **display manager that auto-launches Delta** as the session. We don't want a GNOME / KDE shell; the user goes straight from the splash screen into Delta. Use `cage` (Wayland) or `nodm` (X11) — cage is the cleaner choice.
- A **base distro** for the rest of userspace. Debian 12 / Ubuntu 24.04 LTS / Alpine. Debian is the most boring choice (good).
- **NetworkManager** for wifi. Delta's renderer will surface this as a top-bar chip; the bottom is `nmcli` / DBus.
- **PipeWire** for audio. Delta's renderer surfaces volume + output-device pick.
- **systemd-boot** as the boot loader (UEFI only; we drop BIOS support).
- **A first-run wizard** that runs once per device: pick the wifi, set the timezone, set the Delta-OS lock PIN (which becomes the device PIN — same hash + salt as Delta's existing `accountLockKind`).
- **OSTree** for atomic updates. Each Delta-OS release is a single signed OSTree commit; updates download the diff, never break boot, can always roll back to the previous deployment.

## Stuff that doesn't carry over

The browser-only Delta features that need rethinking on the OS:

- **"Set as default browser"** is meaningless when Delta is the only chrome. Hide the setting on OS builds.
- **Auto-update via GitHub Releases** is replaced by OSTree.
- **Sleep / wake / suspend / brightness / battery / wifi** all become part of Delta — the renderer has to grow a status bar with these.
- **The macOS Touch-ID lock** path in `requireBiometric` is dead on Linux; replace with `fprintd` on hardware that has a fingerprint reader, falling back to the PIN.

## What you'd need to decide before any code lands

1. **Target hardware first.** Pick one: (a) any UEFI x86_64 laptop from 2018+, or (b) a single reference device like the Framework 13 or a Lenovo X1 Carbon. (a) is more useful, (b) is shippable in months.
2. **Signing posture.** Plan to register with Microsoft for shim-signed Secure Boot? If not, every user has to disable Secure Boot to boot Delta-OS, which kills most adoption.
3. **Support burden.** Linux distro maintainers spend 50%+ of their time on bug reports about specific hardware. Are you ready to triage "Delta-OS won't boot on my Inspiron 5570" issues?
4. **Where does the kernel come from?** Take Debian's stable kernel and don't touch it (recommended), OR roll your own (don't).

## Honest assessment

This is **months of work** even with the recommended Shape B path. The good news is most of it is *system integration*, not Delta-the-browser work — every commit you've already made to `apps/browser/` continues to apply. The new code is:

- A `build-iso/` directory with the live-build recipes.
- A `delta-os-session/` directory with the cage wrapper, the first-run wizard, the status-bar additions.
- A signed-release pipeline.

The AI-OS / second-brain track (Skills 1-5) keeps shipping in parallel inside `apps/browser/` and `apps/os/` and lands automatically in the bootable image.

## What to do next, if you want to start

1. Build a Debian 12 + `cage` + Delta `.deb` live ISO locally. Boot it in QEMU. Don't worry about wifi / sleep / brightness on the first pass.
2. Find one volunteer with a Framework 13 or similar and verify it boots there.
3. If both work, write a `build-iso/` recipe and commit it. **Then** decide if it's worth shipping to the world.

Drop a "start the ISO" reply and I'll start step 1 in a separate `apps/os-iso/` workspace.
