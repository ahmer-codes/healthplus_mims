<script setup lang="ts">
import {
  Bell,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
  X,
} from '@lucide/vue'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BrandMark from '@/components/common/BrandMark.vue'
import Dropdown from '@/components/common/Dropdown.vue'
import { APP_NAME, HOSPITAL_NAME } from '@/constants'
import { useAppPage, useAuth, useNotifications } from '@/composables'
import { useUiStore } from '@/stores'

const router = useRouter()
const ui = useUiStore()
const { user, logout } = useAuth()
const { pageTitle, pageSubtitle } = useAppPage()
const {
  items: notificationItems,
  loading: notificationsLoading,
  open: notificationsOpen,
  unreadCount,
  load: reloadNotifications,
  toggle: toggleNotifications,
  close: closeNotifications,
} = useNotifications()

const headerSearch = ref('')
const mobileSearchOpen = ref(false)
const notifyRoot = ref<HTMLElement | null>(null)
const mobileSearchInput = useTemplateRef<HTMLInputElement>('mobileSearchInput')

async function onLogout() {
  await logout()
}

async function goSettings() {
  await router.push('/settings')
}

function onSearchSubmit() {
  const q = headerSearch.value.trim()
  mobileSearchOpen.value = false
  void router.push({
    path: '/stock/batches',
    query: q ? { q } : undefined,
  })
}

async function openMobileSearch() {
  closeNotifications()
  mobileSearchOpen.value = true
  await nextTick()
  mobileSearchInput.value?.focus()
}

function closeMobileSearch() {
  mobileSearchOpen.value = false
}

function toggleMobileSearch() {
  if (mobileSearchOpen.value) closeMobileSearch()
  else void openMobileSearch()
}

function onNotifyPointerDown(event: MouseEvent) {
  if (!notificationsOpen.value) return
  if (!notifyRoot.value?.contains(event.target as Node)) {
    closeNotifications()
  }
}

function onHeaderKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeNotifications()
    closeMobileSearch()
  }
}

async function openNotification(href: string) {
  closeNotifications()
  await nextTick()
  await router.push(href)
}

watch(notificationsOpen, (open) => {
  if (open) closeMobileSearch()
})

onMounted(() => {
  document.addEventListener('mousedown', onNotifyPointerDown)
  document.addEventListener('keydown', onHeaderKey)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onNotifyPointerDown)
  document.removeEventListener('keydown', onHeaderKey)
})
</script>

<template>
  <header class="app-header">
    <button
      type="button"
      class="app-header__icon-btn md:hidden"
      :class="mobileSearchOpen ? '!hidden' : ''"
      aria-label="Open navigation"
      @click="ui.openMobileNav()"
    >
      <Menu class="size-4.5" aria-hidden="true" />
    </button>

    <RouterLink
      to="/dashboard"
      class="relative z-[1] flex shrink-0 items-center gap-2.5 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
      :class="mobileSearchOpen ? 'hidden' : ''"
    >
      <BrandMark size="sm" />
      <div class="min-w-0 leading-tight">
        <p class="app-header__brand-name text-display text-[0.9375rem] font-semibold tracking-tight">
          {{ HOSPITAL_NAME }}
        </p>
        <p class="app-header__brand-sub text-[10px] font-medium uppercase tracking-[0.07em]">
          {{ APP_NAME }}
        </p>
      </div>
    </RouterLink>

    <div class="app-header__rule hidden lg:block" aria-hidden="true" />

    <button
      type="button"
      class="app-header__icon-btn relative z-[1]"
      :class="mobileSearchOpen ? 'hidden' : 'hidden md:inline-flex'"
      :aria-label="ui.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
      :aria-pressed="ui.sidebarOpen"
      @click="ui.toggleSidebar()"
    >
      <PanelLeftClose v-if="ui.sidebarOpen" class="size-4" aria-hidden="true" />
      <PanelLeftOpen v-else class="size-4" aria-hidden="true" />
    </button>

    <!-- Page title: large screens only (where the inline search lives) -->
    <div class="relative z-[1] hidden min-w-0 flex-1 lg:block">
      <p class="app-header__eyebrow truncate text-[11px] font-medium uppercase tracking-[0.06em]">
        Workspace
      </p>
      <p
        class="app-header__title truncate text-display text-[1rem] font-semibold leading-tight"
      >
        {{ pageTitle }}
        <span
          v-if="pageSubtitle"
          class="app-header__subtitle ml-1.5 hidden font-sans text-[12px] font-normal xl:inline"
        >
          · {{ pageSubtitle }}
        </span>
      </p>
    </div>

    <!-- Compact search field when icon is pressed (below lg) -->
    <form
      v-if="mobileSearchOpen"
      class="relative z-[1] min-w-0 flex-1 lg:hidden"
      @submit.prevent="onSearchSubmit"
    >
      <label class="sr-only" for="header-search-mobile">Search inventory</label>
      <input
        id="header-search-mobile"
        ref="mobileSearchInput"
        v-model="headerSearch"
        type="search"
        placeholder="Search medicine or batch…"
        class="app-header__search app-header__search--compact"
        @keydown.escape.prevent="closeMobileSearch"
      />
    </form>
    <div v-else class="min-w-0 flex-1 lg:hidden" aria-hidden="true" />

    <!-- Desktop inline search -->
    <form
      class="relative z-[1] hidden w-[17rem] shrink-0 lg:block xl:w-[19rem]"
      @submit.prevent="onSearchSubmit"
    >
      <label class="sr-only" for="header-search">Search inventory</label>
      <Search
        class="app-header__search-icon size-3.5"
        aria-hidden="true"
      />
      <input
        id="header-search"
        v-model="headerSearch"
        type="search"
        placeholder="Search medicine or batch…"
        class="app-header__search"
      />
    </form>

    <!-- Search icon: small screens only -->
    <button
      type="button"
      class="app-header__icon-btn relative z-[1] shrink-0 lg:hidden"
      :aria-label="mobileSearchOpen ? 'Close search' : 'Search inventory'"
      :aria-expanded="mobileSearchOpen"
      @click="toggleMobileSearch()"
    >
      <X v-if="mobileSearchOpen" class="size-4" aria-hidden="true" />
      <Search v-else class="size-4" aria-hidden="true" />
    </button>

    <div ref="notifyRoot" class="relative z-[1] shrink-0">
      <button
        type="button"
        class="app-header__icon-btn relative"
        :aria-label="unreadCount ? `Notifications (${unreadCount})` : 'Notifications'"
        :aria-expanded="notificationsOpen"
        @click="toggleNotifications()"
      >
        <Bell class="size-4" aria-hidden="true" />
        <span v-if="unreadCount > 0" class="app-header__badge">
          {{ Math.min(unreadCount, 9) }}
        </span>
      </button>

      <Transition name="dropdown">
        <div
          v-if="notificationsOpen"
          class="app-header__notify-panel overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-lg)]"
          role="dialog"
          aria-label="Notifications"
        >
          <div class="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p class="text-sm font-semibold text-ink">Alerts</p>
            <button
              type="button"
              class="text-xs font-medium text-primary hover:opacity-80"
              @click="reloadNotifications()"
            >
              Refresh
            </button>
          </div>
          <div class="max-h-80 overflow-y-auto thin-scroll">
            <p v-if="notificationsLoading" class="px-3 py-8 text-center text-sm text-ink-muted">
              Loading alerts…
            </p>
            <p
              v-else-if="!notificationItems.length"
              class="px-3 py-8 text-center text-sm text-ink-muted"
            >
              No alerts right now.
            </p>
            <ul v-else class="divide-y divide-border">
              <li v-for="item in notificationItems" :key="item.id">
                <button
                  type="button"
                  class="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  @click="openNotification(item.href)"
                >
                  <span class="text-sm font-medium text-ink">{{ item.title }}</span>
                  <span class="text-xs text-ink-muted">{{ item.body }}</span>
                </button>
              </li>
            </ul>
          </div>
          <div class="border-t border-border px-3 py-2">
            <button
              type="button"
              class="text-xs font-medium text-ink-muted hover:text-ink"
              @click="closeNotifications(); void goSettings()"
            >
              Notification preferences…
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="app-header__rule hidden sm:block" aria-hidden="true" />

    <Dropdown align="right" label="Account menu" class="relative z-[1] shrink-0">
      <template #trigger>
        <span class="app-header__account relative z-[1]">
          <img
            src="/hospital-avatar.jpg"
            alt=""
            width="32"
            height="32"
            class="app-header__avatar"
            decoding="async"
            fetchpriority="low"
            aria-hidden="true"
          />
          <span class="hidden min-w-0 text-left leading-tight sm:block">
            <span
              class="app-header__account-name block max-w-[9rem] truncate text-[13px] font-medium"
            >
              {{ user?.displayName ?? 'Guest' }}
            </span>
            <span
              class="app-header__account-role block text-[10px] font-medium uppercase tracking-[0.06em]"
            >
              {{ user?.role ?? 'staff' }}
            </span>
          </span>
        </span>
      </template>

      <template #default="{ close }">
        <div class="border-b border-border px-3 py-2.5">
          <p class="text-sm font-medium text-ink">{{ user?.displayName ?? 'Guest' }}</p>
          <p class="truncate text-xs text-ink-muted">
            {{ user?.email ?? 'Not signed in' }}
          </p>
        </div>
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary transition-colors hover:bg-surface-muted"
          @click="close(); void goSettings()"
        >
          <UserRound class="size-3.5 text-ink-muted" aria-hidden="true" />
          Profile
        </button>
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary transition-colors hover:bg-surface-muted"
          @click="close(); void goSettings()"
        >
          <Settings class="size-3.5 text-ink-muted" aria-hidden="true" />
          Settings
        </button>
        <div class="my-1 border-t border-border" />
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-subtle"
          @click="close(); onLogout()"
        >
          <LogOut class="size-3.5" aria-hidden="true" />
          Log out
        </button>
      </template>
    </Dropdown>
  </header>
</template>
