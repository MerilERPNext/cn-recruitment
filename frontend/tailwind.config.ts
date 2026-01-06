/** @type {import('tailwindcss').Config} */

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
  darkMode: "media",
  theme: {
    extend: {
      /* =============================== * COLORS (PW PALETTE) * =============================== */
      colors: {
        app: "#F8F7FF",
        surface: "#F8F7FF",
        primary: {
          DEFAULT: "#5A4BDA", // PW Indigo 500
          10: "#F8F7FF",
          50: "#F1EFFF",
          100: "#D2CCFF ",
          200: "#B2A9FF",
          300: "#9387FF",
          400: "#7363FC",
          500: "#5A4BDA",
          600: "#4437B8",
          700: "#312596 ",
          800: "#211774",
          900: "#140D52",
        },
        secondary: {
          DEFAULT: "#6172F3",
          10: "#F5F8FF",
          50: "#EEF4FF",
          100: "#E0EAFF",
          200: "#C7D7FE",
          300: "#A4BCFD",
          400: "#8098F9",
          500: "#6172F3",
          600: "#444CE7",
          700: "#3538CD",
          800: "#2D31A6",
          900: "#2D3282",
        },

        gray: {
          10: "#EAECEF",
          50: "#E4E7EA",
          100: "#D9DCE1 ",
          200: "#CDD1D8",
          300: "#C1C6CE",
          400: "#B5BBC5",
          500: "#989DA5",
          600: "#7B7F86",
          700: "#5E6166 ",
          800: "#414347",
          900: "#26282D",
        },
        text: {
          title: "#1B2124",
          body1: "#3D3D3D",
          body2: "#757575",
          disabled: "#A1A3A4",
          success: "#1B7938",
          warning: "#EAAA2E",
          error: "#BF2734",
          primary: "#5A4BDA",
          link: "#037CBF",
        },
        success: {
          DEFAULT: "#16B364",
          50: "#EDFCF2",
          100: "#E0FBE7",
          200: "#AAF0C4",
          600: "#099250",
          800: "#095C37",
        },

        warning: {
          DEFAULT: "#EAAA2E",
          50: "#FDEFD3",
          100: "#F7E0B4",
          200: "#F4D392",
          600: "#C58F27",
          800: "#7A5818",
        },

        error: {
          DEFAULT: "#BF2734",
          50: "#F2D0D4",
          100: "#E8B1B6",
          200: "#DE8F95",
          600: "#A0212C ",
          800: "#63141B",
        },

        info: {
          DEFAULT: "#0EA5E9",
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
        "md": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "body-semibold": ["16px", { lineHeight: "24px", fontWeight: "600" }],

        /* =============================== * SMALL BODY * =============================== */
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],

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
  plugins: [],
};
