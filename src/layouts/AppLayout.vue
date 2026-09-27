<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import Toast from '@/components/feedback/Toast.vue'
import { useUiStore } from '@/stores'

const ui = useUiStore()

function syncSidebarToViewport() {
  const width = window.innerWidth
  if (width < 768) {
    ui.closeMobileNav()
  } else if (width < 1024) {
    ui.setSidebarOpen(false)
  } else {
    ui.setSidebarOpen(true)
  }
}

onMounted(() => {
  document.documentElement.classList.add('app-shell-lock')
  syncSidebarToViewport()
  window.addEventListener('resize', syncSidebarToViewport)
})

onUnmounted(() => {
  document.documentElement.classList.remove('app-shell-lock')
  window.removeEventListener('resize', syncSidebarToViewport)
})
</script>

<template>
  <!-- Fixed shell: only <main> scrolls -->
  <div class="flex h-dvh max-w-[100vw] flex-col overflow-hidden bg-surface-muted">
    <AppHeader />

    <div class="flex min-h-0 min-w-0 flex-1 relative z-0">
      <AppSidebar />
      <MobileNav />

      <main class="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto thin-scroll px-4 py-5 sm:px-5 sm:py-6 lg:px-7">
        <div class="mx-auto w-full max-w-[var(--content-max)] pb-8">
          <RouterView v-slot="{ Component, route }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <Toast />
  </div>
</template>
