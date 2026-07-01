// Native macOS application menu. Also gives us the keyboard accelerators —
// when wired here, ⌘T / ⌘W / ⌘L / ⌘R / ⌘F / ⌘1..⌘9 / ⌘⇧T fire even from
// a focused WebContentsView (the renderer-side keydown handler can't see
// keys pressed inside a child page).
//
// Menu actions that don't need renderer state operate on TabManager
// directly. Actions that do (focus address bar, toggle assistant, open
// settings, open find bar) send IPC events the renderer subscribes to.
import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron"
import type { TabManager } from "./tabs"

export type MenuDeps = {
  win: BrowserWindow
  tabs: TabManager
}

const isMac = process.platform === "darwin"

function send(win: BrowserWindow, channel: string, ...args: unknown[]): void {
  if (!win.isDestroyed()) win.webContents.send(channel, ...args)
}

export function buildMenu({ win, tabs }: MenuDeps): Menu {
  const template: MenuItemConstructorOptions[] = [
    // ── App (macOS only) ─────────────────────────────────
    ...(isMac
      ? ([{
          label: "Delta",
          submenu: [
            { role: "about" as const },
            { type: "separator" as const },
            {
              label: "Settings…",
              accelerator: "Cmd+,",
              click: () => send(win, "menu:openSettings"),
            },
            { type: "separator" as const },
            { role: "services" as const },
            { type: "separator" as const },
            { role: "hide" as const },
            { role: "hideOthers" as const },
            { role: "unhide" as const },
            { type: "separator" as const },
            { role: "quit" as const },
          ],
        }] satisfies MenuItemConstructorOptions[])
      : []),

    // ── File ────────────────────────────────────────────
    {
      label: "File",
      submenu: [
        {
          label: "New Tab",
          accelerator: "CommandOrControl+T",
          click: () => tabs.create(),
        },
        {
          label: "Close Tab",
          accelerator: "CommandOrControl+W",
          click: () => {
            const state = tabs.getState()
            if (state.activeId) tabs.close(state.activeId)
          },
        },
        {
          label: "Reopen Closed Tab",
          accelerator: "CommandOrControl+Shift+T",
          click: () => tabs.reopenClosed(),
        },
        { type: "separator" },
        ...(!isMac
          ? ([{
              label: "Quit",
              accelerator: "CommandOrControl+Q",
              click: () => app.quit(),
            }] satisfies MenuItemConstructorOptions[])
          : []),
      ],
    },

    // ── Edit (cut/copy/paste defaults; macOS adds dictation/emoji) ────
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find in Page…",
          accelerator: "CommandOrControl+F",
          click: () => send(win, "menu:openFind"),
        },
      ],
    },

    // ── View ────────────────────────────────────────────
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CommandOrControl+R",
          click: () => {
            const state = tabs.getState()
            if (state.activeId) tabs.reload(state.activeId)
          },
        },
        { type: "separator" },
        {
          label: "Focus Address Bar",
          accelerator: "CommandOrControl+L",
          click: () => send(win, "menu:focusAddressBar"),
        },
        {
          label: "Toggle Assistant",
          accelerator: "CommandOrControl+J",
          click: () => send(win, "menu:toggleAssistant"),
        },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },

    // ── History (back/forward + ⌘1..⌘9) ──────────────────
    {
      label: "History",
      submenu: [
        {
          label: "Back",
          accelerator: "CommandOrControl+[",
          click: () => {
            const state = tabs.getState()
            if (state.activeId) tabs.back(state.activeId)
          },
        },
        {
          label: "Forward",
          accelerator: "CommandOrControl+]",
          click: () => {
            const state = tabs.getState()
            if (state.activeId) tabs.forward(state.activeId)
          },
        },
        { type: "separator" },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
          label: `Tab ${n}`,
          accelerator: `CommandOrControl+${n}`,
          click: () => tabs.activateNth(n),
        })),
        {
          label: "Last Tab",
          accelerator: "CommandOrControl+9",
          click: () => tabs.activateNth(9),
        },
      ],
    },

    // ── Window ──────────────────────────────────────────
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? ([{ role: "front" as const }, { type: "separator" as const }, { role: "window" as const }] satisfies MenuItemConstructorOptions[]) : []),
      ],
    },

    // ── Help ────────────────────────────────────────────
    {
      label: "Help",
      submenu: [
        {
          label: "Delta on GitHub",
          click: () => {
            void import("electron").then(({ shell }) => shell.openExternal("https://github.com/unhosted-ai/browser"))
          },
        },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
