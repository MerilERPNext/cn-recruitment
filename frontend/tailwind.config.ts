/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx,css}", "./index.html"],
  safelist: [
    "grid-cols-1",
    "grid-cols-2",
    "grid-cols-3",
    "grid-cols-4",
    "grid-cols-5",
    "grid-cols-6",
    "grid-cols-7",
    "grid-cols-8",
    "grid-cols-9",
    "grid-cols-10",
    "grid-cols-11",
    "grid-cols-12",
  ],
  // Driven by <html data-theme>, set by ThemeProvider. "media" was OS-only
  // and could not be toggled.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      /* =============================== * COLORS (PW PALETTE) * =============================== */
      colors: {
        // Every token below resolves to a CSS variable, so one theme.css swap
        // re-themes all existing utility classes. Light values are the exact
        // literals the app rendered before, so Light Mode is unchanged.
        white: "rgb(var(--surface) / <alpha-value>)",
        app: "rgb(var(--app) / <alpha-value>)",
        surface: "rgb(var(--surface-sunken) / <alpha-value>)",
        card: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--surface-raised) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        "on-primary": "rgb(var(--on-primary) / <alpha-value>)",
        primary: {
          // Nova Cyan ramp. The DEFAULT tracks the theme variable; the numbered
          // steps are literal so gradients, charts and hover states keep fixed
          // relationships. 900 lands on Nebula Blue, the palette's anchor.
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          10: "#F2FCFF",
          50: "#EAFBFF",
          100: "#C9F5FF",
          200: "#9DEDFF",
          300: "#6BE4FF",
          400: "#3ADEFF",
          500: "#18D9FF",
          600: "#00B8DE",
          700: "#0A93B0",
          800: "#0F6B80",
          900: "#103448",
        },
        secondary: {
          DEFAULT: "#7A5AF8",
          10: "#FAFAFF",
          50: "#F4F3FF",
          100: "#EBE9FE",
          200: "#D9D6FE",
          300: "#BDB4FE",
          400: "#9B8AFB",
          500: "#7A5AF8", // Secondary
          600: "#6938EF",
          700: "#5925DC",
          800: "#4A1FB8",
          900: "#3E1C96",
        },

        gray: {
          10: "rgb(var(--gray-10) / <alpha-value>)",
          50: "rgb(var(--gray-50) / <alpha-value>)",
          100: "rgb(var(--gray-100) / <alpha-value>)",
          200: "rgb(var(--gray-200) / <alpha-value>)",
          300: "rgb(var(--gray-300) / <alpha-value>)",
          400: "rgb(var(--gray-400) / <alpha-value>)",
          500: "rgb(var(--gray-500) / <alpha-value>)",
          600: "rgb(var(--gray-600) / <alpha-value>)",
          700: "rgb(var(--gray-700) / <alpha-value>)",
          800: "rgb(var(--gray-800) / <alpha-value>)",
          900: "rgb(var(--gray-900) / <alpha-value>)",
        },
        text: {
          title: "rgb(var(--text-title) / <alpha-value>)",
          body1: "rgb(var(--text-body1) / <alpha-value>)",
          body2: "rgb(var(--text-body2) / <alpha-value>)",
          disabled: "rgb(var(--text-disabled) / <alpha-value>)",
          success: "rgb(var(--success) / <alpha-value>)",
          warning: "rgb(var(--warning) / <alpha-value>)",
          error: "rgb(var(--error) / <alpha-value>)",
          primary: "rgb(var(--text-primary-brand) / <alpha-value>)",
          link: "rgb(var(--text-link) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          50: "#EDFCF2",
          100: "#E0FBE7",
          200: "#AAF0C4",
          600: "#099250",
          800: "#095C37",
        },

        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          50: "#FDEFD3",
          100: "#F7E0B4",
          200: "#F4D392",
          600: "#C58F27",
          800: "#7A5818",
        },

        error: {
          DEFAULT: "rgb(var(--error) / <alpha-value>)",
          50: "#F2D0D4",
          100: "#E8B1B6",
          200: "#DE8F95",
          600: "#A0212C ",
          800: "#63141B",
        },

        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          50: "#E0F2FE",
          100: "#C7E4FD",
          200: "#A4D1FE",
          600: "#0284C7",
          800: "#075985",
        },

        "gray-darker": "#504747",
      },

      /* =============================== * FONTS (PW TYPOGRAPHY) * =============================== */
      fontFamily: {
        brand: ['"Reddit Sans"', "system-ui", "sans-serif"],
        sans: ['"Reddit Sans"', "system-ui", "sans-serif"],
        serif: ['"Reddit Sans"', "system-ui", "sans-serif"],
        inconsolata: ["Inconsolata"],
        source: [
          "source-code-pro",
          "Menlo",
          "Monaco",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },

      /* =============================== * EVERYTHING BELOW IS UNCHANGED * =============================== */

      spacing: {
        7.5: "1.875rem",
        15: "3.75rem",
        22: "5.5rem",
        25: "6.25rem",
        26: "6.5rem",
        30: "8.5rem",
        32: "9rem",
        68: "17rem",
      },
      padding: {
        px: "1px",
      },
      margin: {
        px: "1px",
        "-px": "-1px",
        "-2px": "-2px",
        auto: "auto",
      },
      fontWeight: {
        hairline: 100,
      },
      minWidth: {
        site: "18.75rem",
        "input-mini": "17.5rem",
        "input-small": "31.25rem",
        "input-medium": "36.3125rem",
        "input-large": "61.45rem",
        "button-mini": "5.5rem",
        "button-small": "7rem",
        "button-medium": "9.875rem",
        "button-large": "10rem",
      },
      width: {
        arrow: ".8rem",
        "3/10": "30%",
        "7/10": "70%",
        "9/10": "90%",
        "12/25": "48%",
      },
      maxWidth: {
        sm: "30rem",
        md: "40rem",
        lg: "50rem",
        xl: "60rem",
        "2xl": "70rem",
        "3xl": "80rem",
        "4xl": "90rem",
        "5xl": "100rem",
        "1/4": "25%",
        "1/2": "50%",
        "3/5": "60%",
        "4/5": "80%",
        "9/10": "90%",
        "site-mini": "17.5rem",
        "site-small": "31.25rem",
        "site-medium": "43.75rem",
        "site-large": "56.25rem",
        site: "73.75rem",
        screen: "100vw",
      },
      height: {
        arrow: ".4rem",
        px: "1px",
        4: "1rem",
        5: "1.25rem",
        8: "1.8rem",
        9: "2.25rem",
        10: "2.5rem",
        11: "2.75rem",
        12: "3rem",
        16: "4rem",
        24: "6rem",
        32: "8rem",
      },
      borderWidth: {
        1: "1px",
        5: "5px",
      },
      borderRadius: {
        half: "50%",
        full: "100%",
      },
      zIndex: {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 6,
      },
      fill: {
        transparent: "transparent",
      },
      fontSize: {
        /* DISPLAY */
        "display-1": ["80px", { lineHeight: "100px", fontWeight: "700" }],
        "display-2": ["64px", { lineHeight: "80px", fontWeight: "700" }],

        /* HEADINGS */
        h1: ["40px", { lineHeight: "50px", fontWeight: "700" }],
        h2: ["32px", { lineHeight: "44px", fontWeight: "700" }],
        h3: ["24px", { lineHeight: "32px", fontWeight: "700" }],
        h4: ["20px", { lineHeight: "28px", fontWeight: "700" }],

        /* =============================== * SUBHEADING * =============================== */
        subheading: ["18px", { lineHeight: "28px", fontWeight: "600" }],

        /* =============================== * BODY * =============================== */
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-medium": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        md: ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "body-semibold": ["16px", { lineHeight: "24px", fontWeight: "600" }],

        /* =============================== * SMALL BODY * =============================== */
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        sm: ["14px", { lineHeight: "20px", fontWeight: "400" }],

        /* =============================== * TINY / LABEL * =============================== */
        label: ["10px", { lineHeight: "16px", fontWeight: "500" }],
      },
      flex: {
        2: "2 2 0%",
        3: "3 3 0%",
      },
    },
    outline: {
      none: ["2px solid transparent", "2px"],
      white: ["2px dotted white", "2px"],
      black: ["2px dotted black", "2px"],
    },
  },
  variants: {
    extend: {},
  },
  corePlugins: {
    borderCollapse: true,
  },
  plugins: [
    plugin(({ addComponents }) => {
      addComponents({
        ".hover-lift": {
          "@apply hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50":
            {},
        },
      });
    }),
  ],
};
