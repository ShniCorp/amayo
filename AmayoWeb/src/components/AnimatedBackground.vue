<template>
  <div class="animated-background">
    <div class="gradient-layer layer-1"></div>
    <div class="gradient-layer layer-2"></div>
    <div class="gradient-layer layer-3"></div>
    <div class="grid-pattern"></div>
  </div>
</template>

<script setup>
// Fondo animado con gradientes rojos en movimiento
</script>

<style scoped>
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
  background: #0a0a0a;
}

.grid-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  z-index: 1;
}

.gradient-layer {
  position: absolute;
  width: 150%;
  height: 150%;
  opacity: 0.6;
  filter: blur(80px);
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.layer-1 {
  background: radial-gradient(circle at 30% 50%, var(--color-primary, #ff1744) 0%, transparent 50%);
  animation: slide1 15s infinite;
}

.layer-2 {
  background: radial-gradient(circle at 70% 60%, var(--color-accent, #d50000) 0%, transparent 50%);
  animation: slide2 20s infinite;
  animation-delay: -5s;
}

.layer-3 {
  background: radial-gradient(circle at 50% 40%, var(--color-secondary, #ff5252) 0%, transparent 50%);
  animation: slide3 18s infinite;
  animation-delay: -10s;
}

@keyframes slide1 {
  0%, 100% {
    transform: translate(-10%, -10%) rotate(0deg);
  }
  50% {
    transform: translate(10%, 10%) rotate(180deg);
  }
}

@keyframes slide2 {
  0%, 100% {
    transform: translate(10%, -10%) rotate(0deg);
  }
  50% {
    transform: translate(-10%, 10%) rotate(-180deg);
  }
}

@keyframes slide3 {
  0%, 100% {
    transform: translate(0%, 10%) rotate(0deg);
  }
  50% {
    transform: translate(0%, -10%) rotate(360deg);
  }
}
</style>
