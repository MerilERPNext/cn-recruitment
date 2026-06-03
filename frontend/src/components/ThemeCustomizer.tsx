import { useEffect, useState } from "react";
import { Palette, X, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Dynamic theme customizer.
// Lets the user pick a custom Primary / Secondary color that re-themes the
// WHOLE project at runtime. It regenerates the full Tailwind shade ramp
// (50–900) from the picked color and writes it to the CSS variables that
// tailwind.config.ts + index.css read (--color-primary-*, --color-secondary-*),
// plus the legacy --primary-color / --secondary-color used by raw var() styles.
// Choices persist in localStorage. Fully self-contained — it only overrides
// CSS custom properties, no app logic is touched.
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

// Returns an "r g b" triplet string for a given base color + shade.
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
  // Legacy hex variable used by raw var(--primary-color) styles.
  root.style.setProperty(`--${name}-color`, hex);
  // Full Tailwind scale.
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

const FIELDS: { key: ColorName; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
];

const ThemeCustomizer = () => {
  const [open, setOpen] = useState(false);
  const [bases, setBases] = useState<Bases>(() => loadBases() ?? { ...DEFAULT_BASES });

  // On mount, apply a saved custom theme (if any). When none is saved we leave
  // the defaults from index.css/tailwind.config.ts untouched.
  useEffect(() => {
    const saved = loadBases();
    if (saved) {
      applyColor("primary", saved.primary);
      applyColor("secondary", saved.secondary);
    }
  }, []);

  const updateColor = (name: ColorName, hex: string) => {
    const next = { ...bases, [name]: hex };
    setBases(next);
    applyColor(name, hex);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage unavailable — apply in-memory only */
    }
  };

  const reset = () => {
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
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Customize theme"
        title="Customize theme"
        className="fixed bottom-6 right-6 z-[1000] w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{
          background:
            "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
        }}
      >
        <Palette size={20} />
      </button>

      {/* Color picker panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[1000] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Theme Colors</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-600">{label}</span>
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

          <button
            type="button"
            onClick={reset}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} /> Reset to default
          </button>
        </div>
      )}
    </>
  );
};

export default ThemeCustomizer;
