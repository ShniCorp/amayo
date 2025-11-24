<template>
  <div class="skeleton-container">
    <div class="skeleton-sidebar">
      <div class="skeleton-header">
        <div class="skeleton-logo"></div>
        <div class="skeleton-title"></div>
      </div>
      
      <div class="skeleton-stats">
        <div class="skeleton-stat" v-for="i in 4" :key="i">
          <div class="skeleton-stat-icon"></div>
          <div class="skeleton-stat-text"></div>
        </div>
      </div>
      
      <div class="skeleton-buttons">
        <div class="skeleton-button"></div>
        <div class="skeleton-button"></div>
      </div>
      
      <div class="skeleton-list">
        <div class="skeleton-list-item" v-for="i in 8" :key="i">
          <div class="skeleton-item-icon"></div>
          <div class="skeleton-item-text"></div>
        </div>
      </div>
    </div>
    
    <div class="skeleton-main">
      <div class="skeleton-editor-header"></div>
      <div class="skeleton-editor-content">
        <div class="skeleton-code-line" v-for="i in 20" :key="i" :style="{ width: `${60 + Math.random() * 35}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.skeleton-container {
  display: flex;
  height: 100vh;
  background-color: #1e1e1e;
  overflow: hidden;
}

.skeleton-sidebar {
  width: 280px;
  background-color: #252526;
  border-right: 1px solid #3e3e42;
  padding: 16px;
}

.skeleton-header {
  margin-bottom: 24px;
}

.skeleton-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 12px;
}

.skeleton-title {
  width: 180px;
  height: 24px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-stats {
  margin-bottom: 24px;
}

.skeleton-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.skeleton-stat-icon {
  width: 20px;
  height: 20px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-stat-text {
  flex: 1;
  height: 16px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.skeleton-button {
  flex: 1;
  height: 36px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-list {
  margin-top: 16px;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.skeleton-item-icon {
  width: 16px;
  height: 16px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 3px;
}

.skeleton-item-text {
  flex: 1;
  height: 14px;
  background: linear-gradient(90deg, #2d2d30 25%, #3e3e42 50%, #2d2d30 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
}

.skeleton-editor-header {
  height: 40px;
  background: linear-gradient(90deg, #252526 25%, #2d2d30 50%, #252526 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-bottom: 1px solid #3e3e42;
}

.skeleton-editor-content {
  flex: 1;
  padding: 20px;
}

.skeleton-code-line {
  height: 18px;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #252526 25%, #2d2d30 50%, #252526 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 3px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
