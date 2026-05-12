import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        cream: {
          DEFAULT: "hsl(var(--cream))",
          dark: "hsl(var(--cream-dark))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted: "hsl(var(--ink-muted))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          ink: "hsl(var(--accent-ink))",
        },
        line: "hsl(var(--line))",
        danger: "hsl(var(--danger))",
        success: "hsl(var(--success))",
        warn: "hsl(var(--warn))",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 0 0 hsl(var(--ink) / 0.08), 0 4px 16px -8px hsl(var(--ink) / 0.12)",
        ink: "2px 2px 0 0 hsl(var(--ink))",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
