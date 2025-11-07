<template>
  <nav class="island-navbar">
    <div class="navbar-content">
      <!-- Logo Section -->
      <div class="logo-section">
        <div class="bot-avatar">
          <img :src="favicon" alt="Amayo Bot" />
        </div>
        <span class="bot-name">{{ botName }}</span>
      </div>

      <!-- Actions Section -->
      <div class="actions-section">
        <!-- Theme Selector Dropdown -->
        <div class="theme-dropdown" ref="themeDropdown">
          <button class="theme-toggle-btn" @click="toggleThemeMenu">
            <div class="current-theme-preview" :style="{ background: getCurrentThemeGradient() }"></div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
            </svg>
          </button>
          <div v-show="showThemeMenu" class="theme-menu">
            <button
              v-for="theme in themes"
              :key="theme.name"
              :class="['theme-menu-item', { active: currentTheme === theme.name }]"
              @click="changeTheme(theme.name)"
            >
              <div class="theme-preview" :style="{ background: theme.gradient }"></div>
              <span>{{ t(`themes.${theme.name}`) }}</span>
              <svg v-if="currentTheme === theme.name" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 4L6 11L3 8" stroke="#00e676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Language Selector -->
        <button class="lang-btn" @click="toggleLanguage">
          {{ currentLang === 'es' ? '🇪🇸' : '🇺🇸' }}
        </button>

        <!-- Navigation Buttons -->
        <a href="/dashboard" class="nav-btn primary">
          {{ t('navbar.dashboard') }}
        </a>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const favicon = ref('https://docs.amayo.dev/favicon.ico') // Reemplaza con el avatar real del bot
const botName = ref('Amayo')

const currentTheme = ref('red')
const currentLang = computed(() => locale.value)
const showThemeMenu = ref(false)
const themeDropdown = ref(null)

const themes = [
  { name: 'red', gradient: 'linear-gradient(135deg, #ff1744, #d50000)' },
  { name: 'blue', gradient: 'linear-gradient(135deg, #2196f3, #1565c0)' },
  { name: 'green', gradient: 'linear-gradient(135deg, #00e676, #00c853)' },
  { name: 'purple', gradient: 'linear-gradient(135deg, #e040fb, #9c27b0)' },
  { name: 'orange', gradient: 'linear-gradient(135deg, #ff9100, #ff6d00)' },
]

const getCurrentThemeGradient = () => {
  const theme = themes.find(t => t.name === currentTheme.value)
  return theme ? theme.gradient : themes[0].gradient
}

const toggleThemeMenu = () => {
  showThemeMenu.value = !showThemeMenu.value
}

const changeTheme = (themeName) => {
  currentTheme.value = themeName
  document.documentElement.setAttribute('data-theme', themeName)
  localStorage.setItem('theme', themeName)
  showThemeMenu.value = false
}

const toggleLanguage = () => {
  locale.value = locale.value === 'es' ? 'en' : 'es'
  localStorage.setItem('language', locale.value)
}

const handleClickOutside = (event) => {
  if (themeDropdown.value && !themeDropdown.value.contains(event.target)) {
    showThemeMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  const savedTheme = localStorage.getItem('theme')
  const savedLang = localStorage.getItem('language')
  
  if (savedTheme) {
    currentTheme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
  
  if (savedLang) {
    locale.value = savedLang
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.island-navbar {
  position: fixed;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 1200px;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--color-primary, #ff1744);
  box-shadow: 0 0 20px var(--color-glow, rgba(255, 23, 68, 0.3));
}

.bot-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bot-name {
  font-size: 1.2rem;
  font-weight: 700;
  background: var(--gradient-primary, linear-gradient(135deg, #ff1744, #ff5252));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-dropdown {
  position: relative;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.current-theme-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.theme-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.theme-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  font-size: 0.95rem;
}

.theme-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.theme-menu-item.active {
  background: rgba(255, 255, 255, 0.05);
}

.theme-preview {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.theme-menu-item span {
  flex: 1;
  text-align: left;
}

.lang-btn {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.nav-btn {
  padding: 10px 24px;
  border-radius: 25px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
}

.nav-btn.primary {
  background: var(--gradient-primary, linear-gradient(135deg, #ff1744, #d50000));
  color: white;
  box-shadow: 0 4px 15px var(--color-glow, rgba(255, 23, 68, 0.4));
}

.nav-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--color-glow, rgba(255, 23, 68, 0.6));
}

.nav-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .navbar-content {
    padding: 10px 16px;
  }

  .bot-name {
    display: none;
  }

  .theme-dropdown {
    display: none;
  }

  .nav-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
}

@media (max-width: 640px) {
  .island-navbar {
    position: absolute;
    top: 25px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 85%;
    max-width: 1200px;
  }
}
</style>
