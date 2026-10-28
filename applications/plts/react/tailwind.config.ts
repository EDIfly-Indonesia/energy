import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        basis: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        scada: {
          bg: "#0f2a10",
          card: "#1e293b",
          border: "#525e6e",
          text: "#e2f0e8",
          muted: "#94b8a1",
          50: "#eef4ee",
          100: "#d7e6d8",
          200: "#b2ceb4",
          300: "#84ad87",
          400: "#598b5c",
          500: "#3e6e41",
          600: "#2f5632",
          700: "#244126",
          800: "#1a2f1c",
          900: "#0f2a10",
          950: "#071508",
        },
      },
    },
  },
  plugins: [],
} satisfies Config