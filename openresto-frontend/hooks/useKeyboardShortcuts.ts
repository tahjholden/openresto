import { useEffect, useRef } from "react";
import { Platform } from "react-native";

export type ShortcutHandler = (e: KeyboardEvent) => void;
export type ShortcutMap = Record<string, ShortcutHandler>;

const GOPHER_PREFIX = "g";
const GOPHER_TIMEOUT_MS = 1500;

function isTypingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Web-only global keyboard shortcut listener. No-op on native (Platform.OS !==
 * "web"). Non-Escape shortcuts are suppressed while focused in an input/
 * textarea/contentEditable element. Supports two-key "g "-prefixed sequences
 * (e.g. "g d") via a short-lived pending state, in addition to plain single
 * keys (e.g. "?", "l", "Escape").
 */
export function useKeyboardShortcuts(map: ShortcutMap): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let pendingPrefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPendingPrefix = () => {
      pendingPrefix = null;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Never intercept browser-reserved combos (Ctrl/Cmd+T/W/N/L/R, etc.) —
      // no shortcut in this feature is bound with a modifier.
      if (e.ctrlKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      const typing = isTypingTarget(target);
      if (typing && e.key !== "Escape") return;

      const currentMap = mapRef.current;

      if (pendingPrefix === GOPHER_PREFIX) {
        const spec = `${GOPHER_PREFIX} ${e.key}`;
        clearPendingPrefix();
        currentMap[spec]?.(e);
        return;
      }

      if (e.key === GOPHER_PREFIX) {
        pendingPrefix = GOPHER_PREFIX;
        prefixTimer = setTimeout(clearPendingPrefix, GOPHER_TIMEOUT_MS);
        return;
      }

      currentMap[e.key]?.(e);
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearPendingPrefix();
    };
  }, []);
}
