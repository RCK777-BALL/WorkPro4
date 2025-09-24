import type { Config } from "tailwindcss";
export default {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        mutedfg: "var(--muted-fg)",
        border: "var(--border)",
        brand: { DEFAULT: "var(--brand-2)" },
        accent: { DEFAULT: "var(--accent-1)" },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        background: "var(--bg)",
        foreground: "var(--fg)",
        mutedSurface: "var(--muted)",
        card: "color-mix(in oklab, var(--bg) 92%, black 8%)",
        surface: "color-mix(in oklab, var(--bg) 98%, black 2%)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-fg)"
        }
      },
      borderRadius: { xl: "var(--radius)" },
      boxShadow: { xl: "var(--shadow-lg)" }
    }
  },
  darkMode: ["class", '[data-theme="dark"]'],
  plugins: []
} satisfies Config;
