/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#f6894c',
          dark: '#231f20',
          gray: '#414042',
        },
        surface: {
          base: '#ffffff',
          ground: '#f8fafc',
          muted: '#f1f5f9',
          hover: '#f8f9fa'
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          draft: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium': '0 8px 30px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
      }
    },
  },
  plugins: [],
}
