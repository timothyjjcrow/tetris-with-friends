/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        flash: "flash 0.5s ease-in-out",
        glow: "glow 0.5s ease-in-out",
        shake: "shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
        "pulse-fast": "pulse 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        "rotate-center": "rotatePiece 0.4s ease-in-out forwards",
      },
      keyframes: {
        flash: {
          "0%": {
            boxShadow: "0 0 0 rgba(59, 130, 246, 0)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.7)",
            opacity: "0.8",
          },
          "100%": {
            boxShadow: "0 0 0 rgba(59, 130, 246, 0)",
            opacity: "0",
          },
        },
        glow: {
          "0%": {
            opacity: "0.1",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
          "50%": {
            opacity: "0.3",
            backgroundColor: "rgba(59, 130, 246, 0.3)",
          },
          "100%": {
            opacity: "0",
            backgroundColor: "rgba(59, 130, 246, 0)",
          },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        rotatePiece: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(90deg)" },
        },
      },
    },
  },
  plugins: [],
};
