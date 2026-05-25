export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: {
          base: '#0e0e10',
          surface: '#16161a',
          elevated: '#1e1e24',
          hover: '#252530',
          border: '#2a2a35',
        },
        accent: {
          DEFAULT: '#7c6af7',
          muted: '#4f3fcc33',
          hover: '#9d8fff',
        },
        text: {
          primary: '#e8e8f0',
          secondary: '#8888a0',
          muted: '#55556a',
        },
        success: '#34d399',
        danger: '#f87171',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
