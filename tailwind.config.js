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
          blue: '#0F0C0B', // Darker Sepia/Almost Black
          gold: '#C5A059', // Antique Gold
          beige: '#E6DCC3', // Parchment
          white: '#FAF9F6', // Off-white
          gray: '#2C2420', // Lighter brown for contrast/borders
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
      backgroundImage: {
        'sacred-pattern': "url('/pattern.png')", // Placeholder, will use CSS gradients/patterns for now
      }
    },
  },
  plugins: [],
}
