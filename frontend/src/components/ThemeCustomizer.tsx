/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Dynamic theming — custom brand colors.
// Pick Primary / Secondary; we regenerate the full Tailwind shade ramp (10–900)
// and write the CSS variables that tailwind.config.ts + index.css read
// (--color-primary-*, --color-secondary-*) plus the legacy --primary-color /
// --secondary-color used by raw var() styles. Persists in localStorage and is
// applied on app load.
//
// Exports:
//   default  <ThemeCustomizer/>   — no-UI initializer; applies the saved theme
//                                    on load (mount once in App).
//   <ThemeSettingsContent/>       — the settings UI, rendered on the dedicated
//                                    Theme Settings page.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "app-custom-theme";

// Base (shade 500) defaults — mirror tailwind.config.ts primary/secondary 500.
const DEFAULT_BASES = {
  primary: "#6172F3",
  secondary: "#7A5AF8",
};

type Bases = typeof DEFAULT_BASES;
type ColorName = keyof Bases;

const SHADES = [10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// For each shade: [target channel (255 = white, 0 = black), mix amount].
// 500 is the picked base; lighter shades mix toward white, darker toward black.
const SHADE_MIX: Record<(typeof SHADES)[number], [number, number]> = {
  10: [255, 0.97],
  50: [255, 0.93],
  100: [255, 0.85],
  200: [255, 0.7],
  300: [255, 0.52],
  400: [255, 0.28],
  500: [255, 0],
  600: [0, 0.12],
  700: [0, 0.24],
  800: [0, 0.36],
  900: [0, 0.48],
};

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const mix = (channel: number, target: number, amount: number) =>
  Math.round(channel + (target - channel) * amount);

const tripletForShade = (
  base: { r: number; g: number; b: number },
  shade: (typeof SHADES)[number]
) => {
  const [target, amount] = SHADE_MIX[shade];
  return `${mix(base.r, target, amount)} ${mix(base.g, target, amount)} ${mix(
    base.b,
    target,
    amount
  )}`;
};

const applyColor = (name: ColorName, hex: string) => {
  const root = document.documentElement;
  const rgb = hexToRgb(hex);
  root.style.setProperty(`--${name}-color`, hex);
  SHADES.forEach((shade) =>
    root.style.setProperty(`--color-${name}-${shade}`, tripletForShade(rgb, shade))
  );
};

const clearColor = (name: ColorName) => {
  const root = document.documentElement;
  root.style.removeProperty(`--${name}-color`);
  SHADES.forEach((shade) => root.style.removeProperty(`--color-${name}-${shade}`));
};

const loadBases = (): Bases | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BASES, ...(JSON.parse(raw) as Partial<Bases>) };
  } catch {
    /* ignore malformed storage */
  }
  return null;
};

// Apply the saved custom colors (called on app load).
export const applySavedTheme = () => {
  const saved = loadBases();
  if (saved) {
    applyColor("primary", saved.primary);
    applyColor("secondary", saved.secondary);
  }
};

const COLOR_FIELDS: { key: ColorName; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
];

// ---------------------------------------------------------------------------
// Theme Settings UI — rendered on the dedicated Theme Settings page.
// ---------------------------------------------------------------------------
export const ThemeSettingsContent = () => {
  const [bases, setBases] = useState<Bases>(() => loadBases() ?? { ...DEFAULT_BASES });

  const updateColor = (name: ColorName, hex: string) => {
    const next = { ...bases, [name]: hex };
    setBases(next);
    applyColor(name, hex);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const resetColors = () => {
    setBases({ ...DEFAULT_BASES });
    clearColor("primary");
    clearColor("secondary");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Brand colors */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-800">Brand Colors</h2>
          <button
            type="button"
            onClick={resetColors}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          These apply across the whole app instantly.
        </p>

        <div className="space-y-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-lg border border-gray-200 shrink-0"
                  style={{ background: bases[key] }}
                />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 uppercase">
                  {bases[key]}
                </span>
                <input
                  type="color"
                  value={bases[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
                  aria-label={`${label} color`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live preview */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-4">Preview</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--primary-color)" }}
          >
            Primary Button
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-secondary-500">
            Secondary Button
          </button>
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700">
            Badge
          </span>
          <span className="text-primary-600 text-sm font-semibold underline">
            Link
          </span>
        </div>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Default export — no-UI initializer. Applies the saved theme on app load.
// ---------------------------------------------------------------------------
const ThemeCustomizer = () => {
  useEffect(() => {
    applySavedTheme();
  }, []);

  return null;
};

export default ThemeCustomizer;
