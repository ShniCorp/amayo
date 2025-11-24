<template>
  <div class="auth-callback">
    <div class="loader">
      <div class="spinner"></div>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth'

const router = useRouter()
const message = ref('Autenticando con Discord...')

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const error = urlParams.get('error')

  if (error) {
    message.value = 'Error en la autenticación'
    setTimeout(() => router.push('/'), 2000)
    return
  }

  if (code) {
    try {
      await authService.handleCallback(code)
      message.value = '¡Autenticación exitosa!'
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      message.value = 'Error al procesar la autenticación'
      console.error(err)
      setTimeout(() => router.push('/'), 2000)
    }
  } else {
    message.value = 'Código no encontrado'
    setTimeout(() => router.push('/'), 2000)
  }
})
</script>

<style scoped>
.auth-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
}

.loader {
  text-align: center;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ff1744;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

p {
  color: white;
  font-size: 1.1rem;
}
</style>
