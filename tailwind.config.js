/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#eff6ff',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
          }
        },
        fontFamily: {
          sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Source Sans Pro', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
          display: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
          serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.6s ease-out',
          'slide-up': 'slideUp 0.6s ease-out',
          'scale-in': 'scaleIn 0.4s ease-out',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          scaleIn: {
            '0%': { transform: 'scale(0.95)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' },
          },
        },
      },
    },
    plugins: [],
  }