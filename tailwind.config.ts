import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EverGreen brand palette
        evergreen: {
          DEFAULT: "#4EB35E",
          50: "#EEF8F0",
          100: "#DCF0DF",
          200: "#B7E1BE",
          300: "#92D29D",
          400: "#6DC37B",
          500: "#4EB35E", // primary
          600: "#4C9C54", // primary-dark
          700: "#3C7D43",
          800: "#2C5D32",
          900: "#1C3E21",
        },
        sage: {
          DEFAULT: "#9CC4AC",
          light: "#C8DED2",
          dark: "#7AA88C",
        },
        slate: {
          ink: "#44546C", // dark slate gray from palette
          muted: "#6B7A90",
          line: "#D6D8DD", // light steel blue from palette
          bg: "#F5F6F8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(68, 84, 108, 0.06), 0 1px 3px rgba(68, 84, 108, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
