import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Group colors
        group: {
          family: {
            bg: "hsl(var(--group-family-bg))",
            text: "hsl(var(--group-family-text))",
            border: "hsl(var(--group-family-border))",
          },
          friend: {
            bg: "hsl(var(--group-friend-bg))",
            text: "hsl(var(--group-friend-text))",
            border: "hsl(var(--group-friend-border))",
          },
          work: {
            bg: "hsl(var(--group-work-bg))",
            text: "hsl(var(--group-work-text))",
            border: "hsl(var(--group-work-border))",
          },
          other: {
            bg: "hsl(var(--group-other-bg))",
            text: "hsl(var(--group-other-text))",
            border: "hsl(var(--group-other-border))",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(139, 92, 246, 0.08)",
        "soft-hover": "0 20px 40px -15px rgba(139, 92, 246, 0.16)",
        glow: "0 0 25px -5px rgba(236, 72, 153, 0.35)",
        card: "0 2px 10px rgba(0, 0, 0, 0.04), 0 10px 30px -5px rgba(0, 0, 0, 0.05)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "2xs": "0 1px 1px 0 rgba(0, 0, 0, 0.03)",
      },
      keyframes: {
        "shimmer-slide": {
          to: {
            transform: "translate(calc(100% + var(--shimmer-width, 100%)), 0)",
          },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "shimmer-slide": "shimmer-slide var(--speed, 2s) ease-in-out infinite alternate",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
