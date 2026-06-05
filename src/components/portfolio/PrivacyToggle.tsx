"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const PRIVACY_BLUR_KEY = "privacy-blur";
const PRIVACY_BLUR_CLASS = "privacy-blur";
const PRIVACY_BLUR_EVENT = "privacy-blur-change";

// The source of truth is the `privacy-blur` class on <html>, applied before
// paint by the inline script in the root layout. We read it via
// useSyncExternalStore so SSR and the first client render agree (no hydration
// mismatch) and the toggle stays consistent across any future instances.
function subscribe(callback: () => void) {
  window.addEventListener(PRIVACY_BLUR_EVENT, callback);
  return () => window.removeEventListener(PRIVACY_BLUR_EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains(PRIVACY_BLUR_CLASS);
}

function getServerSnapshot() {
  return false;
}

/**
 * Header CTA to blur every euro amount on the dashboard so the app can be shown
 * to others without revealing net worth. State lives per-device in localStorage
 * and is mirrored as a class on <html>; an inline script in the root layout
 * applies it before paint to avoid flashing real values on reload.
 */
export function PrivacyToggle() {
  const t = useTranslations("portfolio");
  const blurred = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggle = () => {
    const next = !blurred;
    document.documentElement.classList.toggle(PRIVACY_BLUR_CLASS, next);
    localStorage.setItem(PRIVACY_BLUR_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(PRIVACY_BLUR_EVENT));
  };

  const label = blurred ? t("showAmounts") : t("hideAmounts");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={blurred}
    >
      {blurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}
