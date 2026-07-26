/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          blue: '#3a76f0',
          'blue-hover': '#2c66d9',
          'blue-light': '#e8f0fe',
          dark: 'var(--bg-main)',
          sidebar: 'var(--bg-sidebar)',
          rail: 'var(--bg-rail)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          border: 'var(--border-color)',
          bubble: {
            sent: '#3a76f0',
            received: 'var(--bg-bubble-received)',
          },
          text: {
            primary: 'var(--text-main)',
            secondary: 'var(--text-muted)',
            muted: '#6b7280',
          },
        },
      },
    },
  },
  plugins: [],
};
