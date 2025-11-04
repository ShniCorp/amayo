<template>
  <div id="app">
    <AnimatedBackground />
    <IslandNavbar />
    <HeroSection />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AnimatedBackground from './components/AnimatedBackground.vue'
import IslandNavbar from './components/IslandNavbar.vue'
import HeroSection from './components/HeroSection.vue'
import { useTheme } from './composables/useTheme'

const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<style>
:root {
  --color-primary: #ff1744;
  --color-secondary: #d50000;
  --color-accent: #ff5252;
  --gradient-primary: linear-gradient(135deg, #ff1744, #d50000);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #0a0a0a;
  color: white;
  overflow-x: hidden;
}

#app {
  position: relative;
  min-height: 100vh;
}
</style>
