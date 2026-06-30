/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        brand: "#C45E89",
        accent: "#65B6AE",
        purple: "#704282",
        lavender: "#645D69",
      },
      fontFamily: {
        sans: ["Gotham", "Raleway", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
