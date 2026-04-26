import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        graphite: "rgb(var(--color-graphite) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        bone: "rgb(var(--color-bone) / <alpha-value>)",
        oxide: "rgb(var(--color-oxide) / <alpha-value>)",
        mineral: "rgb(var(--color-mineral) / <alpha-value>)",
        cobalt: "rgb(var(--color-cobalt) / <alpha-value>)",
        pollen: "rgb(var(--color-pollen) / <alpha-value>)",
        punch: "rgb(var(--color-punch) / <alpha-value>)"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        ui: ["Aptos", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        brutal: "4px 4px 0 rgb(var(--color-shadow))",
        "brutal-sm": "2px 2px 0 rgb(var(--color-shadow))",
        panel: "0 2px 0 rgb(var(--color-shadow))"
      }
    }
  },
  plugins: []
} satisfies Config;
