/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sacred: {
          blue: 'rgb(var(--color-sacred-blue) / <alpha-value>)',
          gold: 'rgb(var(--color-sacred-gold) / <alpha-value>)',
          beige: 'rgb(var(--color-sacred-beige) / <alpha-value>)',
          white: 'rgb(var(--color-sacred-white) / <alpha-value>)',
          gray: 'rgb(var(--color-sacred-gray) / <alpha-value>)',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
      backgroundImage: {
        'sacred-pattern': "url('/pattern.png')",
      }
    },
  },
  plugins: [],
}
