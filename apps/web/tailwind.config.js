/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A1A",
        brand: "#C45E89",
        "brand-dark": "#A84A73",
        "tint-brand": "rgba(196,94,137,0.12)",
        accent: "#65B6AE",
        "accent-dark": "#4E9991",
        "tint-accent": "rgba(101,182,174,0.12)",
        purple: "#704282",
        "purple-dark": "#5A3468",
        "tint-purple": "rgba(112,66,130,0.12)",
        lavender: "#645D69",
        footer: "#1E1722",
      },
      fontFamily: {
        sans: ["Raleway", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1100px",
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
      },
      screens: {
        sm: "480px",
        md: "768px",
        lg: "1024px",
      },
    },
  },
  plugins: [],
};
