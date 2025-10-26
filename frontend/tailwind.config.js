/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-delay': 'float 6s ease-in-out 2s infinite',
        'rain': 'rain 1s linear infinite',
        'rain-heavy': 'rain 0.6s linear infinite',
        'lightning': 'lightning 2s ease-in-out infinite',
        'fog-1': 'fog 8s ease-in-out infinite',
        'fog-2': 'fog 8s ease-in-out 2s infinite',
        'fog-3': 'fog 8s ease-in-out 4s infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'twinkle-delay': 'twinkle 2s ease-in-out 1s infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rain: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateY(200%)', opacity: '1' },
        },
        lightning: {
          '0%, 50%, 100%': { opacity: '0' },
          '49%, 51%': { opacity: '1' },
        },
        fog: {
          '0%, 100%': { transform: 'translateX(-20%)', opacity: '0.3' },
          '50%': { transform: 'translateX(20%)', opacity: '0.6' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
