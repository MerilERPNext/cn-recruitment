import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "../providers/themeContext";

/** Read or change the active theme. Must be used under <ThemeProvider>. */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default useTheme;
