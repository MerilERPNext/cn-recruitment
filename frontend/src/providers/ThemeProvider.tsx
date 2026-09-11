import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from "./themeContext";
import { useClientTheme } from "../services/themeService";

/**
 * Applies the theme by stamping `data-theme` on <html>, which is what
 * tailwind.config.ts and src/styles/theme.css both key off.
 *
 * The initial value is also written by an inline script in index.html, before
 * React mounts, so the first paint is already correct — without it the app
 * flashes light before hydrating into dark.
 *
 * COLOR VALUES are then layered on top from the backend (see
 * services/themeService.ts): src/styles/theme.css's static `:root`/
 * `[data-theme]` blocks are the fallback, never removed. Once the client's
 * design tokens arrive, each is applied as an inline `style.setProperty`,
 * which — being an inline style — overrides the stylesheet rule for that one
 * variable. Nothing configured yet, or the request fails? Nothing is applied,
 * and the static defaults keep rendering exactly as before this existed.
 */

const isPreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const readStored = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "light";
  } catch {
    // Safari in private mode throws on localStorage access.
    return "light";
  }
};

const systemTheme = (): ResolvedTheme =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);
  const firstPaint = useRef(true);

  const theme: ResolvedTheme = preference === "system" ? system : preference;

  // Follow the OS live, but only while the user is actually on "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Skip the transition on the very first paint, otherwise the whole page
    // visibly fades in on load. Only user-driven switches animate.
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    root.classList.add("theme-transition");
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 220);
    return () => window.clearTimeout(timer);
  }, [theme]);

  // Backend-driven color override, layered on top of the static defaults
  // above. `tokens` is always the FULL token set for `theme` (never partial —
  // the API fills in any un-set field from its own defaults), so every
  // successful fetch is safe to apply wholesale, including on a light<->dark
  // switch. Loading or erroring leaves the static theme.css values in place.
  const { data: clientTheme } = useClientTheme(theme);

  useEffect(() => {
    if (!clientTheme?.tokens) return;
    const root = document.documentElement;
    Object.entries(clientTheme.tokens).forEach(([name, value]) => {
      root.style.setProperty(`--${name}`, value);
    });
  }, [clientTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
