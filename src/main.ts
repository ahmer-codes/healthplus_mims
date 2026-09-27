import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setupRouterGuards } from './router/guards'
import { useAuthStore, usePreferencesStore } from './stores'
import './styles/base.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  usePreferencesStore().init()

  const auth = useAuthStore()
  await auth.init()

  setupRouterGuards(router)
  app.use(router)

  await router.isReady()
  app.mount('#app')
}

void bootstrap()
