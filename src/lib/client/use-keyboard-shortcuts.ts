"use client";

import { useEffect } from "react";

export type KeyboardShortcut = {
  key: string;
  altKey?: boolean;
  allowInEditable?: boolean;
  onTrigger: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  );
}

export function useKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[],
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const shortcut = shortcuts.find(
        ({ key, altKey = false }) =>
          event.key.toLowerCase() === key.toLowerCase() &&
          event.altKey === altKey,
      );

      if (!shortcut || (!shortcut.allowInEditable && isEditableTarget(event.target))) {
        return;
      }

      event.preventDefault();
      shortcut.onTrigger();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
