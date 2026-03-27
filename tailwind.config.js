/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ffc107",
        "background-light": "#f8f8f5",
        "background-dark": "#0a0a05",
        "surface": "#12120a",
        "border-tactical": "rgba(255, 193, 7, 0.2)",
      },
      fontFamily: {
        "display": ["Outfit", "Space Grotesk", "sans-serif"]
      },
      borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"},
    },
  },
  plugins: [],
}
