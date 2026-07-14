import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stellar-inspired brand palette
        brand: {
          DEFAULT: "#0f172a",
          accent: "#3b82f6",
          muted: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
