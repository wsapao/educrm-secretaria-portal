/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a8a", // Deep Navy do EduCRM
        secondary: "#f59e0b", // Amber
        background: "#f8fafc",
        foreground: "#0f172a",
        card: "#ffffff",
        border: "#e2e8f0"
      }
    },
  },
  plugins: [],
}
