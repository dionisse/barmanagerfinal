/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef3ec",
          100: "#fde0cc",
          200: "#fbc099",
          300: "#f89966",
          400: "#f47133",
          500: "#f05a16",
          600: "#d94a0e",
          700: "#b3390b",
          800: "#8a2c0c",
          900: "#6b240a",
        },
        accent: {
          50: "#fff8e6",
          100: "#ffedbf",
          200: "#ffdb80",
          300: "#ffc540",
          400: "#ffb31a",
          500: "#f5a000",
          600: "#cc8500",
          700: "#a36800",
          800: "#7a4d00",
          900: "#5c3a00",
        },
        night: {
          50: "#f4f5f7",
          100: "#e5e8ec",
          200: "#cad1d9",
          300: "#9da9b8",
          400: "#6b7a8e",
          500: "#49566b",
          600: "#36405a",
          700: "#27304a",
          800: "#1c2338",
          900: "#121729",
          950: "#0a0d1c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
}
