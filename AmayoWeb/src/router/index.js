import { createRouter, createWebHistory } from 'vue-router'
import AuthCallback from '../views/AuthCallback.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback
    },
    // Agregar más rutas según sea necesario
    // {
    //   path: '/dashboard',
    //   name: 'dashboard',
    //   component: () => import('../views/Dashboard.vue'),
    //   meta: { requiresAuth: true }
    // }
  ]
})

// Navigation guard para rutas protegidas
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken')
  
  if (to.meta.requiresAuth && !token) {
    next('/')
  } else {
    next()
  }
})

export default router
