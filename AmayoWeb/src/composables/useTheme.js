import { ref, watch } from 'vue'

const themes = {
  red: {
    primary: '#ff1744',
    secondary: '#d50000',
    accent: '#ff5252',
    gradient: 'linear-gradient(135deg, #ff1744, #d50000)',
    glow: 'rgba(255, 23, 68, 0.5)',
  },
  blue: {
    primary: '#2196f3',
    secondary: '#1565c0',
    accent: '#64b5f6',
    gradient: 'linear-gradient(135deg, #2196f3, #1565c0)',
    glow: 'rgba(33, 150, 243, 0.5)',
  },
  green: {
    primary: '#00e676',
    secondary: '#00c853',
    accent: '#69f0ae',
    gradient: 'linear-gradient(135deg, #00e676, #00c853)',
    glow: 'rgba(0, 230, 118, 0.5)',
  },
  purple: {
    primary: '#e040fb',
    secondary: '#9c27b0',
    accent: '#ea80fc',
    gradient: 'linear-gradient(135deg, #e040fb, #9c27b0)',
    glow: 'rgba(224, 64, 251, 0.5)',
  },
  orange: {
    primary: '#ff9100',
    secondary: '#ff6d00',
    accent: '#ffab40',
    gradient: 'linear-gradient(135deg, #ff9100, #ff6d00)',
    glow: 'rgba(255, 145, 0, 0.5)',
  },
}

const currentTheme = ref('red')

const applyTheme = (themeName) => {
  const theme = themes[themeName]
  if (!theme) return

  const root = document.documentElement
  
  // Aplicar variables CSS
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-secondary', theme.secondary)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--gradient-primary', theme.gradient)
  root.style.setProperty('--color-glow', theme.glow)
  
  // Aplicar data attribute para el tema
  root.setAttribute('data-theme', themeName)
  
  console.log('Theme applied:', themeName, theme)
}

export function useTheme() {
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      currentTheme.value = themeName
      applyTheme(themeName)
      localStorage.setItem('theme', themeName)
    }
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && themes[savedTheme]) {
      currentTheme.value = savedTheme
    }
    applyTheme(currentTheme.value)
  }

  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    currentTheme,
    themes,
    setTheme,
    initTheme,
  }
}
