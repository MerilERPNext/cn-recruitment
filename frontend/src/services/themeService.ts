import { useQuery } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";

const THEME_API = "recruitment.api.theme.get_client_theme";

/**
 * Design tokens for the active client's theme, as CSS custom-property
 * suffixes (no leading "--") mapped to "R G B" values — apply with
 * `style.setProperty("--" + key, value)`.
 */
export type ClientThemeTokens = Record<string, string>;

export type ClientThemeResponse = {
  success: boolean;
  client: string | null;
  theme_key: string;
  theme_name: string;
  mode: "Light" | "Dark";
  tokens: ClientThemeTokens;
};

/**
 * Fetches the backend-driven design tokens for `mode` ("light"/"dark", as
 * ThemeProvider already resolves it). Backed by src/styles/theme.css's
 * static values as the fallback: on error (or while loading) this hook
 * simply returns no data, and ThemeProvider applies nothing on top of those
 * static defaults — there is no separate "theme API is down" UI state.
 */
export const useClientTheme = (mode: "light" | "dark") => {
  return useQuery<ClientThemeResponse>({
    queryKey: ["client-theme", mode],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(THEME_API, {
        mode: mode === "dark" ? "Dark" : "Light",
      });
      return response as ClientThemeResponse;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};

export default useClientTheme;
