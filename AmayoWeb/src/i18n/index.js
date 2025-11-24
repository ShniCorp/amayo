import { createI18n } from 'vue-i18n'
import messages from './locales'

const savedLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('language') 
  : null

export const i18n = createI18n({
  legacy: false,
  locale: savedLanguage || 'es',
  fallbackLocale: 'es',
  messages,
  globalInjection: true,
})
