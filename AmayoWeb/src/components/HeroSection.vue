<template>
  <section class="hero-section">
    <div class="hero-content">
      <div class="hero-text">
        <h1 class="hero-title">
          <span ref="typewriterRef" class="typewriter">{{ displayText }}</span>
          <span ref="cursorRef" class="cursor" :class="{ blink: showCursor }">|</span>
        </h1>
        <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
        
        <div class="hero-actions">
          <button class="hero-btn primary" @click="scrollToFeatures">
            {{ t('hero.exploreFeatures') }}
          </button>
          <button class="hero-btn secondary" @click="inviteBot">
            {{ t('hero.inviteBot') }}
          </button>
        </div>

        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ stats.servers }}+</span>
            <span class="stat-label">{{ t('hero.servers') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.users }}+</span>
            <span class="stat-label">{{ t('hero.users') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.commands }}+</span>
            <span class="stat-label">{{ t('hero.commands') }}</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="floating-card card-1">
          <div class="card-icon">🤝</div>
          <div class="card-text">{{ t('hero.feature1') }}</div>
        </div>
        <div class="floating-card card-2">
          <div class="card-icon">🎫</div>
          <div class="card-text">{{ t('hero.feature2') }}</div>
        </div>
        <div class="floating-card card-3">
          <div class="card-icon">⚙️</div>
          <div class="card-text">{{ t('hero.feature3') }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { botService } from '@/services/bot'

const { t, locale } = useI18n()

const texts = {
  es: 'Un bot con mucha personalidad',
  en: 'A bot beyond comparison'
}

const displayText = ref('')
const showCursor = ref(true)
const currentIndex = ref(0)
const isDeleting = ref(false)
const isLoading = ref(true)
const typewriterRef = ref(null)
const cursorRef = ref(null)

const stats = ref({
  servers: '...',
  users: '...',
  commands: '...'
})

// Cargar estadísticas reales del bot
const loadStats = async () => {
  try {
    isLoading.value = true
    const data = await botService.getStats()
    stats.value = {
      servers: botService.formatNumber(data.servers || 0),
      users: botService.formatNumber(data.users || 0),
      commands: botService.formatNumber(data.commands || 0)
    }
  } catch (error) {
    console.error('Error loading stats:', error)
    // Valores por defecto si falla
    stats.value = {
      servers: '0',
      users: '0',
      commands: '0'
    }
  } finally {
    isLoading.value = false
  }
}

const typewriterEffect = () => {
  const currentText = texts[locale.value] || texts.es
  const speed = isDeleting.value ? 50 : 100

  if (!isDeleting.value) {
    if (currentIndex.value < currentText.length) {
      displayText.value = currentText.substring(0, currentIndex.value + 1)
      currentIndex.value++
      nextTick(() => updateCursorPosition())
      setTimeout(typewriterEffect, speed)
    } else {
      // Pause at the end
      setTimeout(() => {
        isDeleting.value = true
        typewriterEffect()
      }, 2000)
    }
  } else {
    if (currentIndex.value > 0) {
      displayText.value = currentText.substring(0, currentIndex.value - 1)
      currentIndex.value--
      nextTick(() => updateCursorPosition())
      setTimeout(typewriterEffect, speed)
    } else {
      isDeleting.value = false
      setTimeout(typewriterEffect, 500)
    }
  }
}

const updateCursorPosition = () => {
  if (typewriterRef.value && cursorRef.value) {
    const textWidth = typewriterRef.value.offsetWidth
    cursorRef.value.style.left = `${textWidth}px`
  }
}

// Watch for language changes
watch(locale, () => {
  currentIndex.value = 0
  displayText.value = ''
  isDeleting.value = false
  typewriterEffect()
})

onMounted(() => {
  loadStats()
  typewriterEffect()
  
  // Cursor blink
  setInterval(() => {
    showCursor.value = !showCursor.value
  }, 500)

  // Actualizar estadísticas cada 5 minutos
  setInterval(loadStats, 5 * 60 * 1000)
})

const scrollToFeatures = () => {
  document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
}

const inviteBot = () => {
  window.open('https://discord.com/oauth2/authorize?client_id=991062751633883136&permissions=2416176272&integration_type=0&scope=bot', '_blank')
}
</script>

<style scoped>
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 20px 80px;
  position: relative;
}

.hero-content {
  max-width: 1400px;
  width: 100%;
  display: grid;
  grid-template-columns: 600px 1fr;
  gap: 80px;
  align-items: center;
}

.hero-text {
  z-index: 2;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.2;
  min-height: 120px;
  position: relative;
  width: 100%;
  max-width: 600px;
}

.hero-title::before {
  content: 'Un bot con mucha personalidad';
  font-size: 4rem;
  font-weight: 800;
  visibility: hidden;
  display: block;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.typewriter {
  background: linear-gradient(135deg, #fff, var(--color-secondary, #ff5252));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  display: inline-block;
  position: absolute;
  left: 0;
  top: 0;
}

.cursor {
  color: var(--color-primary, #ff1744);
  opacity: 1;
  transition: opacity 0.1s;
  background: none;
  -webkit-text-fill-color: var(--color-primary, #ff1744);
  position: absolute;
  left: 0;
  top: 0;
}

.cursor.blink {
  opacity: 0;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  line-height: 1.6;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.hero-btn {
  padding: 14px 32px;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.hero-btn.primary {
  background: var(--gradient-primary, linear-gradient(135deg, #ff1744, #d50000));
  color: white;
  box-shadow: 0 8px 30px var(--color-glow, rgba(255, 23, 68, 0.4));
}

.hero-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px var(--color-glow, rgba(255, 23, 68, 0.6));
}

.hero-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.hero-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-3px);
}

.hero-stats {
  display: flex;
  gap: 48px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  background: var(--gradient-primary, linear-gradient(135deg, #ff1744, #ff5252));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hero-visual {
  position: relative;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  padding-right: 0;
  overflow: visible;
}

.floating-card {
  position: absolute;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-width: 180px;
  max-width: 200px;
}

.floating-card:hover {
  transform: translateY(-10px) scale(1.05);
  box-shadow: 0 12px 40px var(--color-glow, rgba(255, 23, 68, 0.4));
  border-color: var(--color-primary, #ff1744);
}

.card-1 {
  top: 30px;
  right: -538px;
  animation: float 6s ease-in-out infinite;
}

.card-2 {
  top: 190px;
  right: -772px;
  animation: float 6s ease-in-out infinite 2s;
}

.card-3 {
  bottom: 50px;
  right: -540px;
  animation: float 6s ease-in-out infinite 4s;
}

.card-icon {
  font-size: 3rem;
  filter: drop-shadow(0 0 20px var(--color-glow, rgba(255, 23, 68, 0.5)));
}

.card-text {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  font-weight: 600;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@media (max-width: 968px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .hero-title {
    font-size: 2.5rem;
    min-height: 80px;
    max-width: 500px;
  }

  .hero-title::before {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    max-width: 500px;
  }

  .hero-visual {
    height: 400px;
    padding-right: 0;
    justify-content: flex-end;
    overflow: visible;
  }

  .floating-card {
    padding: 20px;
    min-width: 140px;
    max-width: 160px;
  }

  .card-1 {
    top: 30px;
    right: -200px;
  }

  .card-2 {
    top: 170px;
    right: -300px;
  }

  .card-3 {
    bottom: 70px;
    right: -210px;
  }

  .card-icon {
    font-size: 2.5rem;
  }

  .card-text {
    font-size: 0.85rem;
  }

  .hero-stats {
    gap: 24px;
  }

  .stat-number {
    font-size: 2rem;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2rem;
    min-height: 70px;
    max-width: 100%;
  }

  .hero-title::before {
    font-size: 2rem;
  }

  .hero-subtitle {
    max-width: 100%;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-btn {
    width: 100%;
  }

  .hero-visual {
    height: 300px;
    padding-right: 0;
    overflow: visible;
  }

  .floating-card {
    padding: 16px;
    min-width: 110px;
    max-width: 130px;
  }

  .card-1 {
    top: 24px;
    right: 254px;
  }

  .card-2 {
    top: 20px;
    right: 130px;
  }

  .card-3 {
    bottom: 159px;
    right: 7px;
  }

  .card-icon {
    font-size: 2rem;
  }

  .card-text {
    font-size: 0.75rem;
  }

  .hero-stats {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
    text-align: center;
  }

  .stat-item {
    flex: 1;
    min-width: 100px;
  }
}
</style>
