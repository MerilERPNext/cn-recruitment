import { createContext } from "react";

/** What the user chose. "system" defers to the OS. */
export type ThemePreference = "light" | "dark" | "system";

/** What is actually painted — "system" is always resolved to one of these. */
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  /** The stored preference, including "system". */
  preference: ThemePreference;
  /** The theme currently on screen. */
  theme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  /** Flip light <-> dark. Always lands on an explicit choice, never "system". */
  toggle: () => void;
}

export const THEME_STORAGE_KEY = "theme";

/* Kept in its own module so the provider file exports only components — react
   refresh warns when a file mixes the two. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
