<template>
  <div class="docs-view">
    <AnimatedBackground />
    
    <div class="docs-header">
      <IslandNavbar />
      <HeroSection />
    </div>

    <!-- Contenido principal -->
    <div class="docs-body">
          <!-- Sidebar permanente -->
    <aside class="docs-sidebar">
      <nav class="sidebar-nav">
        <h3>{{ t('docs.sections') }}</h3>
        
        <div class="nav-section">
          <h4>{{ t('docs.getStarted') }}</h4>
          <a href="#introduction" @click.prevent="scrollToSection('introduction')" :class="{ active: activeSection === 'introduction' }">
            📖 {{ t('docs.introduction') }}
          </a>
        </div>

        <div class="nav-section">
          <h4>{{ t('docs.modules') }}</h4>
          <a href="#drops" @click.prevent="scrollToSection('drops')" :class="{ active: activeSection === 'drops' }">
            🎁 {{ t('docs.drops') }}
          </a>
          <a href="#economy" @click.prevent="scrollToSection('economy')" :class="{ active: activeSection === 'economy' }">
            💰 {{ t('docs.economy') }}
          </a>
          <a href="#moderation" @click.prevent="scrollToSection('moderation')" :class="{ active: activeSection === 'moderation' }">
            🛡️ {{ t('docs.moderation') }}
          </a>
          <a href="#utilities" @click.prevent="scrollToSection('utilities')" :class="{ active: activeSection === 'utilities' }">
            🔧 {{ t('docs.utilities') }}
          </a>
          <a href="#alliances" @click.prevent="scrollToSection('alliances')" :class="{ active: activeSection === 'alliances' }">
            🤝 {{ t('docs.alliances') }}
          </a>
        </div>

        <div class="nav-section">
          <h4>{{ t('docs.other') }}</h4>
          <a href="#settings" @click.prevent="scrollToSection('settings')" :class="{ active: activeSection === 'settings' }">
            ⚙️ {{ t('docs.settings') }}
          </a>
          <a href="#support" @click.prevent="scrollToSection('support')" :class="{ active: activeSection === 'support' }">
            💬 {{ t('docs.support') }}
          </a>
        </div>
      </nav>
    </aside>

  <div class="docs-content" ref="docsContent">
      <div class="docs-container">
        <!-- Introduction Section -->
        <section id="introduction" class="doc-section">
          <h1>{{ t('docs.introduction') }}</h1>
          <p class="intro">{{ t('docs.introText') }}</p>
          
          <div class="info-cards">
            <div class="info-card">
              <h3>• {{ t('docs.inviteBot') }}</h3>
            </div>
            <div class="info-card">
              <h3>• {{ t('docs.joinSupport') }}</h3>
            </div>
            <div class="info-card">
              <h3>• {{ t('docs.privacyPolicy') }}</h3>
            </div>
            <div class="info-card">
              <h3>• {{ t('docs.termsOfService') }}</h3>
            </div>
          </div>

          <div class="highlight-box">
            <div class="highlight-icon">💡</div>
            <div class="highlight-content">
              <strong>{{ t('docs.defaultPrefix') }}:</strong> {{ t('docs.prefixInfo') }}
            </div>
          </div>
        </section>

        <!-- Module Sections -->
        <section id="drops" class="doc-section module-section">
          <div class="section-header">
            <span class="section-icon">🎁</span>
            <h2>{{ t('docs.createDrops') }}</h2>
          </div>
          <p>{{ t('docs.dropsDescription') }}</p>
        </section>

        <section id="utilities" class="doc-section module-section">
          <div class="section-header">
            <span class="section-icon">🔧</span>
            <h2>{{ t('docs.utilities') }}</h2>
          </div>
          <p>{{ t('docs.utilitiesDescription') }}</p>
        </section>

        <section id="economy" class="doc-section module-section">
          <div class="section-header">
            <span class="section-icon">💰</span>
            <h2>{{ t('docs.economy') }}</h2>
          </div>
          <p>{{ t('docs.economyDescription') }}</p>
        </section>

        <section id="moderation" class="doc-section module-section">
          <div class="section-header">
            <span class="section-icon">🛡️</span>
            <h2>{{ t('docs.moderation') }}</h2>
          </div>
          <p>{{ t('docs.moderationDescription') }}</p>
        </section>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import AnimatedBackground from '../components/AnimatedBackground.vue';
import IslandNavbar from '../components/docs/IslandNavbar.vue';
import HeroSection from '../components/docs/HeroSection.vue';

const { t } = useI18n();
const { initTheme } = useTheme();
const activeSection = ref('introduction');
const docsContent = ref<HTMLElement | null>(null);

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  const container = docsContent.value;
  if (element && container) {
    // calcular posición relativa dentro del contenedor scrollable
    const elemRect = element.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const offset = elemRect.top - contRect.top + container.scrollTop;
    container.scrollTo({ top: offset - 16, behavior: 'smooth' });
    activeSection.value = sectionId;
    return;
  }

  // fallback al comportamiento global
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeSection.value = sectionId;
  }
};

// Detectar sección activa con scroll (dentro del contenedor docsContent)
const handleScroll = () => {
  const sections = ['introduction', 'drops', 'economy', 'moderation', 'utilities', 'alliances', 'settings', 'support'];
  const container = docsContent.value;
  if (!container) {
    // fallback a window
    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
          activeSection.value = sectionId;
          break;
        }
      }
    }
    return;
  }

  const contRect = container.getBoundingClientRect();
  for (const sectionId of sections) {
    const element = document.getElementById(sectionId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const top = rect.top - contRect.top; // posición relativa dentro del contenedor
      if (top >= 0 && top < container.clientHeight / 2) {
        activeSection.value = sectionId;
        break;
      }
    }
  }
};

onMounted(() => {
  initTheme();
  // si existe el contenedor de docs, listen al scroll interno
  if (docsContent.value) {
    docsContent.value.addEventListener('scroll', handleScroll, { passive: true });
    // inicializar estado
    handleScroll();
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (docsContent.value) {
    docsContent.value.removeEventListener('scroll', handleScroll);
  } else {
    window.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style scoped>
.docs-view {
  width: 100%;
  min-height: 100vh;
  position: relative;
}

.docs-header {
  width: 100%;
  padding: 0 20px;
}

/* Contenedor principal que agrupa sidebar + contenido */
.docs-body {
  display: flex;
  align-items: flex-start;
}

/* Sidebar Fijo */
.docs-sidebar {
  position: sticky;
  left: 20px;
  top: 120px;
  width: 240px;
  height: calc(100vh - 140px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  overflow-y: auto;
  z-index: 100;
}

.sidebar-nav h3 {
  color: white;
  font-size: 1rem;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section h4 {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  font-weight: 600;
}

.sidebar-nav a {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.sidebar-nav a:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
}

.sidebar-nav a.active {
  background: var(--gradient-primary);
  color: white;
  font-weight: 600;
}

/* Contenido principal con compensación automática */
.docs-content {
  width: 100%;
  /* convertir en contenedor scrollable independiente */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding-left: 24%; /* reserva espacio para el sidebar */
  padding-right: 40px;
  padding-top: 20px;
  padding-bottom: 20px;
}

.docs-container {
  max-width: 900px;
  color: white;
}

/* Sections */
.doc-section {
  padding: 60px 0;
  scroll-margin-top: 100px;
}

.doc-section h1 {
  font-size: 2.5rem;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff, #ff5252);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.intro {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  line-height: 1.6;
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.info-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.info-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.info-card h3 {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  margin: 0;
}

/* Highlight Box */
.highlight-box {
  display: flex;
  gap: 16px;
  background: rgba(0, 230, 118, 0.05);
  border: 1px solid rgba(0, 230, 118, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin: 32px 0;
}

.highlight-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.highlight-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.highlight-content strong {
  color: #00e676;
}

/* Module Sections */
.module-section {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.section-header h2 {
  font-size: 2rem;
  color: white;
  margin: 0;
}

.module-section > p {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  font-size: 1.05rem;
}

/* Scrollbar personalizado */
.docs-sidebar::-webkit-scrollbar {
  width: 6px;
}

.docs-sidebar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.docs-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.docs-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive */
@media (max-width: 1200px) {
  .docs-sidebar {
    width: 200px;
  }

  .docs-content {
    padding-left: 260px;
  }
}

@media (max-width: 968px) {
  .docs-sidebar {
    display: none;
  }

  .docs-content {
    padding: 20px;
  }
}

@media (max-width: 640px) {
  .doc-section h1 {
    font-size: 2rem;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }
}
</style>
