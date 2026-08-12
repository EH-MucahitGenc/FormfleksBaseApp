/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#ff7a3d',
          accent: '#c65d2d',
          dark: '#18181b',
          gray: '#71717a',
        },
        surface: {
          base: '#ffffff',
          ground: '#f7f8fa',
          muted: '#e7e7ea',
          hover: '#f2f3f5',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          draft: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24, 24, 27, 0.04)',
        premium: '0 10px 30px rgba(24, 24, 27, 0.05)',
      },
      borderRadius: {
        lg: '10px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
