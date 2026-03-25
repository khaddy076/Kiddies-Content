/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          light: '#A89CFF',
          dark: '#4B44CC',
        },
        secondary: {
          DEFAULT: '#FF6B6B',
          light: '#FF9E9E',
        },
      },
    },
  },
  plugins: [],
};
