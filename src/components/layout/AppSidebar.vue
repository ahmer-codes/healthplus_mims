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
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
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

async function onLogout() {
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

const openGroups = ref<Record<string, boolean>>({})

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
    for (const item of [...NAVIGATION, ...SECONDARY_NAVIGATION]) {
      if (item.children && groupActive(item)) {
        openGroups.value[item.label] = true
      }
    }
  },
  { immediate: true },
)

function toggleGroup(label: string) {
  openGroups.value[label] = !openGroups.value[label]
}

const expanded = computed(() => ui.sidebarOpen)
</script>

<template>
  <aside
    class="hidden md:flex h-full shrink-0 flex-col overflow-hidden border-r border-chrome-border bg-chrome text-ink-inverse transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out)]"
    :class="expanded ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-collapsed-width)]'"
    aria-label="Application sidebar"
  >
    <!-- Primary nav -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 thin-scroll" aria-label="Primary">
      <ul class="space-y-1">
        <li v-for="item in NAVIGATION" :key="item.label">
          <!-- Leaf link -->
          <RouterLink
            v-if="item.to && !item.children"
            :to="item.to"
            :title="item.label"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="
              cn(
                'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-[0.8125rem] transition-colors duration-[var(--duration-fast)]',
                expanded ? '' : 'justify-center',
                isActive(item.to)
                  ? 'bg-primary/15 text-white font-medium'
                  : 'text-chrome-muted hover:bg-chrome-hover hover:text-white',
              )
            "
          >
            <span
              v-if="isActive(item.to)"
              class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
              aria-hidden="true"
            />
            <component
              :is="iconMap[item.icon as keyof typeof iconMap]"
              class="size-[1.125rem] shrink-0"
              :class="isActive(item.to) ? 'text-primary' : 'text-chrome-faint group-hover:text-chrome-muted'"
              aria-hidden="true"
            />
            <span v-if="expanded" class="truncate">{{ item.label }}</span>
          </RouterLink>

          <!-- Group -->
          <div v-else>
            <button
              type="button"
              :title="item.label"
              :aria-expanded="!!openGroups[item.label]"
              :class="
                cn(
                  'group relative flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-[0.8125rem] transition-colors duration-[var(--duration-fast)]',
                  expanded ? '' : 'justify-center',
                  groupActive(item)
                    ? 'text-white font-medium'
                    : 'text-chrome-muted hover:bg-chrome-hover hover:text-white',
                )
              "
              @click="
                expanded ? toggleGroup(item.label) : ui.setSidebarOpen(true)
              "
            >
              <span
                v-if="groupActive(item)"
                class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
                aria-hidden="true"
              />
              <component
                :is="iconMap[item.icon as keyof typeof iconMap]"
                class="size-[1.125rem] shrink-0"
                :class="groupActive(item) ? 'text-primary' : 'text-chrome-faint group-hover:text-chrome-muted'"
                aria-hidden="true"
              />
              <span v-if="expanded" class="flex-1 truncate text-left">{{ item.label }}</span>
              <ChevronDown
                v-if="expanded"
                class="size-3.5 shrink-0 text-chrome-faint transition-transform duration-[var(--duration-fast)]"
                :class="openGroups[item.label] ? 'rotate-180' : ''"
                aria-hidden="true"
              />
            </button>

            <Transition name="fade">
              <ul
                v-if="expanded && openGroups[item.label] && item.children"
                class="relative mt-0.5 ml-[1.125rem] space-y-0.5 border-l border-chrome-border pl-3"
              >
                <li v-for="child in item.children" :key="child.to">
                  <RouterLink
                    :to="child.to"
                    :aria-current="isActive(child.to) ? 'page' : undefined"
                    :class="
                      cn(
                        'block rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-[var(--duration-fast)]',
                        isActive(child.to)
                          ? 'bg-primary/15 text-white font-medium'
                          : 'text-chrome-faint hover:bg-chrome-hover hover:text-chrome-muted',
                      )
                    "
                  >
                    {{ child.label }}
                  </RouterLink>
                </li>
              </ul>
            </Transition>
          </div>
        </li>
      </ul>
    </nav>

    <!-- Secondary -->
    <div class="border-t border-chrome-border px-2.5 py-3">
      <ul class="space-y-1">
        <li v-for="item in SECONDARY_NAVIGATION" :key="item.label">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            :title="item.label"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="
              cn(
                'group flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-[0.8125rem] transition-colors duration-[var(--duration-fast)]',
                expanded ? '' : 'justify-center',
                isActive(item.to)
                  ? 'bg-primary/15 text-white font-medium'
                  : 'text-chrome-muted hover:bg-chrome-hover hover:text-white',
              )
            "
          >
            <component
              :is="iconMap[item.icon as keyof typeof iconMap]"
              class="size-[1.125rem] shrink-0"
              :class="isActive(item.to) ? 'text-primary' : 'text-chrome-faint'"
              aria-hidden="true"
            />
            <span v-if="expanded" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </li>
        <li>
          <button
            type="button"
            title="Log out"
            :class="
              cn(
                'group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-[0.8125rem] transition-colors duration-[var(--duration-fast)]',
                expanded ? '' : 'justify-center',
                'text-chrome-muted hover:bg-danger/15 hover:text-danger',
              )
            "
            @click="onLogout()"
          >
            <LogOut
              class="size-[1.125rem] shrink-0 text-chrome-faint group-hover:text-danger"
              aria-hidden="true"
            />
            <span v-if="expanded" class="truncate">Log out</span>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>
