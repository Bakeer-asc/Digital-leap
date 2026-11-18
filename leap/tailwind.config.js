/** @type {import('tailwindcss').Config} */
/** Palette — proposed design colours for the Digital LEAP system. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   '#173653',
        teal:   '#087F83',
        brand:  '#2563EB',
        canvas: '#F7F9FC',
        ink:    '#172B4D',
        muted:  '#64748B',
        line:   '#E2E8F0',
        ok:     '#16A34A',
        warn:   '#D97706',
        bad:    '#DC2626',
        info:   '#2563EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
