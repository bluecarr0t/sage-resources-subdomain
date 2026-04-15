import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sage: {
          50: "#f6f7f6",
          100: "#e3e7e3",
          200: "#c7d2c7",
          300: "#a3b5a3",
          400: "#7a927a",
          500: "#5c7a5c",
          600: "#4a624a",
          700: "#3d503d",
          800: "#334033",
          900: "#2c362c",
          teal: "#00b6a6",
          "teal-dark": "#009688",
          "teal-text": "#006b5f", // WCAG AA compliant for text on white
          "teal-text-hover": "#005a4f", // Darker for hover states
        },
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [typography],
};
export default config;

