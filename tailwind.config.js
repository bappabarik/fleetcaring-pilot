/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#12151C",
        paper: "#F7F8FA",
        indigo: {
          DEFAULT: "#3652D9",
          light: "#5B74E8",
          dark: "#2740B0",
        },
        amber: {
          DEFAULT: "#E8A33D",
          light: "#F3C27A",
        },
        emerald: {
          DEFAULT: "#1F9D6C",
          light: "#4CBE8E",
        },
        rust: {
          DEFAULT: "#D6484A",
          light: "#E57A7C",
        },
        slate: {
          DEFAULT: "#8891A5",
          light: "#C3C9D6",
          dark: "#5B6478",
        },
      },
    },
  },
  plugins: [],
};
