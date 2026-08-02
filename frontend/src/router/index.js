import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

let progressBar = null
let progressTimer = null

function startProgress() {
  if (progressBar) return
  progressBar = document.createElement('div')
  progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#1677FF,#00C7C7);z-index:9999;transition:width 0.3s ease;box-shadow:0 0 8px rgba(22,119,255,0.5)'
  document.body.appendChild(progressBar)
  let width = 0
  progressTimer = setInterval(() => {
    width += (90 - width) * 0.1
    progressBar.style.width = width + '%'
  }, 100)
}

function finishProgress() {
  if (!progressBar) return
  clearInterval(progressTimer)
  progressBar.style.width = '100%'
  setTimeout(() => {
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.removeChild(progressBar)
    }
    progressBar = null
  }, 300)
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'upload',
        name: 'Upload',
        component: () => import('@/views/DocumentUpload.vue')
      },
      {
        path: 'search-brq',
        name: 'SearchBRQ',
        component: () => import('@/views/SearchBRQ.vue')
      },
      {
        path: 'search-grq',
        name: 'SearchGRQ',
        component: () => import('@/views/SearchGRQ.vue')
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/DocumentList.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.path !== from.path) startProgress()
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

router.afterEach(() => {
  finishProgress()
})

export default router
