<template>
  <section class="hero-section">
    <div class="hero-content">
      <div class="hero-text">
        <h1 class="hero-title">
          <span class="title-text">{{ titleText }}</span>
        </h1>
        <p class="hero-subtitle">{{ t('hero_docs.subtitle') }}</p>
        
        <div class="hero-actions">
          <button class="hero-btn primary" @click="scrollToFeatures">
            {{ t('hero_docs.exploreFeatures') }}
          </button>
          <button class="hero-btn secondary" @click="inviteBot">
            {{ t('hero_docs.inviteBot') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { botService } from '@/services/bot'

const { t, locale } = useI18n()

const titleText = computed(() => {
  return locale.value === 'es' 
    ? 'Comandos, Tickets y Moderación' 
    : 'Commands, Tickets, and Moderation'
})

const isLoading = ref(true)

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

onMounted(() => {
  loadStats()
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
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.hero-text {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.2;
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title-text {
  background: linear-gradient(135deg, #fff, var(--color-secondary, #ff5252));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  line-height: 1.6;
  max-width: 600px;
  text-align: center;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
  justify-content: center;
  flex-wrap: wrap;
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


@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@media (max-width: 968px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-btn {
    width: 100%;
  }
}
</style>
