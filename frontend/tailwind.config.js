/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`
    }
    return `rgb(var(${variableName}))`
  }
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="seiya"]'],
  theme: {
    extend: {
      colors: {
        // Tokens de tema artístico MEP (Ghibli Día & Seiya Noche)
        'rdc-primary': withOpacity('--bg-primary-rgb'),
        'rdc-secondary': withOpacity('--bg-secondary-rgb'),
        'rdc-card': withOpacity('--bg-card-rgb'),
        'rdc-accent': withOpacity('--accent-rgb'),
        'rdc-accent-hover': withOpacity('--accent-hover-rgb'),
        'rdc-accent-secondary': withOpacity('--accent-secondary-rgb'),
        'rdc-text': withOpacity('--text-primary-rgb'),
        'rdc-muted': withOpacity('--text-secondary-rgb'),
        'rdc-border': withOpacity('--border-rgb'),
        'rdc-border-glow': withOpacity('--border-glow-rgb'),
        'rdc-success': withOpacity('--success-rgb'),
        'rdc-warning': withOpacity('--warning-rgb'),
        'rdc-error': withOpacity('--error-rgb'),

        // Badges temáticos
        'mep-gold': withOpacity('--badge-gold-rgb'),
        'mep-purple': withOpacity('--badge-purple-rgb'),
      },
      boxShadow: {
        'theme-glow': 'var(--theme-glow)',
        'theme-subtle-glow': 'var(--theme-subtle-glow)',
      },
      fontFamily: {
        'manga': ['Bangers', 'cursive'],
        'titulo': ['Rajdhani', 'sans-serif'],
        'cuerpo': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
