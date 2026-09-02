import { Moon, Sun } from "lucide-react";
import useTheme from "../../hooks/useTheme";

/**
 * Light/Dark switch.
 *
 * Deliberately a two-state toggle rather than a three-way light/dark/system
 * picker: the header has room for one control, and clicking it is an explicit
 * choice. "System" still applies on first visit, until the user picks a side.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "inline-flex size-9 items-center justify-center rounded-full",
        "border border-gray-200 bg-white text-text-body2",
        "transition-colors hover:bg-gray-10 hover:text-text-title",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
};

export default ThemeToggle;
