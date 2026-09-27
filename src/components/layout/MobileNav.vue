<script setup lang="ts">
import {
  CalendarClock,
  ChevronDown,
  FileChartColumn,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  X,
} from '@lucide/vue'
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BrandMark from '@/components/common/BrandMark.vue'
import {
  APP_NAME,
  HOSPITAL_NAME,
  NAVIGATION,
  SECONDARY_NAVIGATION,
  type NavItem,
} from '@/constants'
import { useAuth } from '@/composables'
import { useUiStore } from '@/stores'
import { cn } from '@/utils'

const route = useRoute()
const ui = useUiStore()
const { logout } = useAuth()
const openGroups = ref<Record<string, boolean>>({})

async function onLogout() {
  ui.closeMobileNav()
  await logout()
}

const iconMap = {
  LayoutDashboard,
  Package,
  FileChartColumn,
  CalendarClock,
  Handshake,
  Settings,
} as const

function isActive(to?: string) {
  if (!to) return false
  return route.path === to || route.path.startsWith(`${to}/`)
}

function groupActive(item: NavItem) {
  return item.children?.some((child) => isActive(child.to)) ?? false
}

watch(
  () => route.path,
  () => {
    ui.closeMobileNav()
    for (const item of [...NAVIGATION, ...SECONDARY_NAVIGATION]) {
      if (item.children && groupActive(item)) {
        openGroups.value[item.label] = true
      }
    }
  },
  { immediate: true },
)

watch(
  () => ui.mobileNavOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function toggleGroup(label: string) {
  openGroups.value[label] = !openGroups.value[label]
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-backdrop">
      <div
        v-if="ui.mobileNavOpen"
        class="fixed inset-0 z-40 md:hidden"
        role="presentation"
      >
        <div
          class="absolute inset-0 bg-ink/50"
          aria-hidden="true"
          @click="ui.closeMobileNav()"
        />

        <Transition name="drawer-panel" appear>
          <aside
            v-if="ui.mobileNavOpen"
            class="absolute inset-y-0 left-0 flex w-[min(19.5rem,88vw)] flex-col bg-chrome text-ink-inverse shadow-[var(--shadow-drawer)]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div class="flex h-[var(--header-height)] items-center justify-between border-b border-chrome-border px-4">
              <div class="flex items-center gap-3 min-w-0">
                <BrandMark tone="chrome" size="sm" />
                <div class="min-w-0">
                  <p class="text-display text-sm font-semibold text-white truncate">{{ HOSPITAL_NAME }}</p>
                  <p class="text-[11px] text-chrome-muted truncate">{{ APP_NAME }}</p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-chrome-muted hover:bg-chrome-hover hover:text-white transition-colors duration-[var(--duration-fast)]"
                aria-label="Close navigation"
                @click="ui.closeMobileNav()"
              >
                <X class="size-4" aria-hidden="true" />
              </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-2.5 py-4" aria-label="Primary">
              <ul class="space-y-1">
                <li v-for="item in NAVIGATION" :key="item.label">
                  <RouterLink
                    v-if="item.to && !item.children"
                    :to="item.to"
                    :aria-current="isActive(item.to) ? 'page' : undefined"
                    :class="
                      cn(
                        'flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm transition-colors duration-[var(--duration-fast)]',
                        isActive(item.to)
                          ? 'bg-primary/15 text-white font-medium'
                          : 'text-chrome-muted hover:bg-chrome-hover hover:text-white',
                      )
                    "
                  >
                    <component
                      :is="iconMap[item.icon as keyof typeof iconMap]"
                      class="size-[1.125rem]"
                      :class="isActive(item.to) ? 'text-primary' : 'text-chrome-faint'"
                      aria-hidden="true"
                    />
                    {{ item.label }}
                  </RouterLink>

                  <div v-else>
                    <button
                      type="button"
                      :aria-expanded="!!openGroups[item.label]"
                      class="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm text-chrome-muted hover:bg-chrome-hover hover:text-white transition-colors duration-[var(--duration-fast)]"
                      @click="toggleGroup(item.label)"
                    >
                      <component
                        :is="iconMap[item.icon as keyof typeof iconMap]"
                        class="size-[1.125rem] text-chrome-faint"
                        aria-hidden="true"
                      />
                      <span class="flex-1 text-left">{{ item.label }}</span>
                      <ChevronDown
                        class="size-3.5 transition-transform duration-[var(--duration-fast)]"
                        :class="openGroups[item.label] ? 'rotate-180' : ''"
                        aria-hidden="true"
                      />
                    </button>
                    <ul
                      v-if="openGroups[item.label] && item.children"
                      class="ml-[1.125rem] mt-0.5 space-y-0.5 border-l border-chrome-border pl-3"
                    >
                      <li v-for="child in item.children" :key="child.to">
                        <RouterLink
                          :to="child.to"
                          :aria-current="isActive(child.to) ? 'page' : undefined"
                          :class="
                            cn(
                              'block rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition-colors duration-[var(--duration-fast)]',
                              isActive(child.to)
                                ? 'bg-primary/15 text-white font-medium'
                                : 'text-chrome-faint hover:text-chrome-muted',
                            )
                          "
                        >
                          {{ child.label }}
                        </RouterLink>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </nav>

            <div class="space-y-1 border-t border-chrome-border px-2.5 py-3">
              <RouterLink
                v-for="item in SECONDARY_NAVIGATION"
                :key="item.label"
                :to="item.to!"
                :class="
                  cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm transition-colors duration-[var(--duration-fast)]',
                    isActive(item.to)
                      ? 'bg-primary/15 text-white font-medium'
                      : 'text-chrome-muted hover:bg-chrome-hover hover:text-white',
                  )
                "
              >
                <component
                  :is="iconMap[item.icon as keyof typeof iconMap]"
                  class="size-[1.125rem]"
                  :class="isActive(item.to) ? 'text-primary' : 'text-chrome-faint'"
                  aria-hidden="true"
                />
                {{ item.label }}
              </RouterLink>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm text-chrome-muted transition-colors duration-[var(--duration-fast)] hover:bg-danger/15 hover:text-danger"
                @click="onLogout()"
              >
                <LogOut class="size-[1.125rem] text-chrome-faint" aria-hidden="true" />
                Log out
              </button>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
