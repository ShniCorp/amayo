<template>
  <div class="home-view">
    <AnimatedBackground />
    <IslandNavbar />
    <HeroSection />
  </div>
</template>

<script setup>
import AnimatedBackground from '../components/AnimatedBackground.vue'
import IslandNavbar from '../components/IslandNavbar.vue'
import HeroSection from '../components/HeroSection.vue'
</script>

<style scoped>
.home-view {
  position: relative;
  min-height: 100vh;
}
</style>
