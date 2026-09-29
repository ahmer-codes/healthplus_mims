<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Database, Moon, RefreshCw, Sun, Monitor } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import AppSelect from '@/components/forms/AppSelect.vue'
import { APP_NAME, APP_VERSION, HOSPITAL_NAME } from '@/constants'
import { useAppPage, useAuth, useToast } from '@/composables'
import { isFirebaseConfigured } from '@/firebase'
import { locationService, medicineService } from '@/services'
import { usePreferencesStore, type DensityMode, type ThemeMode } from '@/stores'

const { setPage } = useAppPage()
const { user, role } = useAuth()
const toast = useToast()
const preferences = usePreferencesStore()

const catalogCount = ref<number | null>(null)
const locationCount = ref<number | null>(null)
const refreshing = ref(false)

const firebaseReady = computed(() => isFirebaseConfigured())

const themeOptions = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

const densityOptions = [
  { label: 'Comfortable (125%)', value: 'comfortable' },
  { label: 'Compact (100%)', value: 'compact' },
]

onMounted(() => {
  setPage({
    title: 'Settings',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Settings' }],
  })
  void loadCounts()
})

async function loadCounts() {
  try {
    const [medicines, locations] = await Promise.all([
      medicineService.listActive(),
      locationService.list(true),
    ])
    catalogCount.value = medicines.length
    locationCount.value = locations.length
  } catch {
    catalogCount.value = null
    locationCount.value = null
  }
}

async function refreshCatalog() {
  refreshing.value = true
  try {
    await loadCounts()
    toast.success('Catalog refreshed', `${catalogCount.value ?? 0} medicines · ${locationCount.value ?? 0} locations`)
  } catch {
    toast.error('Refresh failed', 'Could not reload catalog from Firebase.')
  } finally {
    refreshing.value = false
  }
}

function onTheme(value: string) {
  preferences.setTheme(value as ThemeMode)
}

function onDensity(value: string) {
  preferences.setDensity(value as DensityMode)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Settings"
      description="Appearance, alerts, session profile, and Firebase workspace status."
    />

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="space-y-4 lg:col-span-2">
        <section class="surface-panel p-5 space-y-4">
          <SectionHeader
            title="Appearance"
            description="Theme and size. Comfortable zooms the whole UI to 125%; Compact stays at normal size."
          />
          <div class="grid gap-3 sm:grid-cols-2">
            <AppSelect
              label="Theme"
              :model-value="preferences.theme"
              :options="themeOptions"
              @update:model-value="onTheme"
            />
            <AppSelect
              label="Density"
              :model-value="preferences.density"
              :options="densityOptions"
              @update:model-value="onDensity"
            />
          </div>
          <label class="flex items-start gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-muted transition-colors">
            <input
              type="checkbox"
              class="mt-1"
              :checked="preferences.reduceMotion"
              @change="preferences.setReduceMotion(($event.target as HTMLInputElement).checked)"
            />
            <span>
              <span class="block text-sm font-medium text-ink">Reduce motion</span>
              <span class="block text-xs text-ink-muted mt-0.5">
                Minimize transitions and load animations.
              </span>
            </span>
          </label>
          <div class="flex items-center gap-2 text-xs text-ink-muted">
            <Sun v-if="!preferences.resolvedDark" class="size-3.5" aria-hidden="true" />
            <Moon v-else class="size-3.5" aria-hidden="true" />
            <Monitor v-if="preferences.theme === 'system'" class="size-3.5" aria-hidden="true" />
            Active appearance:
            {{ preferences.resolvedDark ? 'Dark' : 'Light' }}
            <span v-if="preferences.theme === 'system'">(follows system)</span>
          </div>
        </section>

        <section class="surface-panel p-5 space-y-4">
          <SectionHeader
            title="Notifications"
            description="Choose which operational alerts appear in the header bell."
          />
          <div class="space-y-2">
            <label class="flex items-start gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-muted transition-colors">
              <input
                type="checkbox"
                class="mt-1"
                :checked="preferences.notifyExpiry"
                @change="preferences.setNotifyExpiry(($event.target as HTMLInputElement).checked)"
              />
              <span>
                <span class="block text-sm font-medium text-ink">Expiry watch</span>
                <span class="block text-xs text-ink-muted mt-0.5">Batches nearing expiry (3-month window).</span>
              </span>
            </label>
            <label class="flex items-start gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-muted transition-colors">
              <input
                type="checkbox"
                class="mt-1"
                :checked="preferences.notifyLowStock"
                @change="preferences.setNotifyLowStock(($event.target as HTMLInputElement).checked)"
              />
              <span>
                <span class="block text-sm font-medium text-ink">Low stock</span>
                <span class="block text-xs text-ink-muted mt-0.5">Lots at or below the default threshold.</span>
              </span>
            </label>
            <label class="flex items-start gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-muted transition-colors">
              <input
                type="checkbox"
                class="mt-1"
                :checked="preferences.notifyDemands"
                @change="preferences.setNotifyDemands(($event.target as HTMLInputElement).checked)"
              />
              <span>
                <span class="block text-sm font-medium text-ink">Pending demands</span>
                <span class="block text-xs text-ink-muted mt-0.5">Open ward/clinic medicine requests.</span>
              </span>
            </label>
          </div>
        </section>

        <section class="surface-panel p-5 space-y-4">
          <SectionHeader
            title="Signed-in profile"
            description="Managed by Firebase Authentication. Not editable here."
          />
          <dl class="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-xs text-ink-muted">Display name</dt>
              <dd class="mt-0.5 font-medium text-ink">{{ user?.displayName || '-' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-muted">Email</dt>
              <dd class="mt-0.5 font-medium text-ink break-all">{{ user?.email || '-' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-muted">Handle</dt>
              <dd class="mt-0.5 font-medium text-ink">{{ user?.username || '-' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-muted">Role</dt>
              <dd class="mt-0.5 font-medium text-ink capitalize">{{ role || '-' }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <aside class="space-y-4">
        <section class="surface-panel p-5 space-y-3">
          <SectionHeader title="Workspace" />
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Application</dt>
              <dd class="text-ink font-medium text-right">{{ APP_NAME }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Hospital</dt>
              <dd class="text-ink font-medium text-right">{{ HOSPITAL_NAME }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Version</dt>
              <dd class="text-ink font-medium text-right">{{ APP_VERSION }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Firebase</dt>
              <dd class="text-ink font-medium text-right">
                {{ firebaseReady ? 'Configured' : 'Missing env' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Medicines</dt>
              <dd class="text-ink font-medium text-right">
                {{ catalogCount === null ? '-' : catalogCount }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-muted">Locations</dt>
              <dd class="text-ink font-medium text-right">
                {{ locationCount === null ? '-' : locationCount }}
              </dd>
            </div>
          </dl>
          <AppButton variant="outline" class="w-full" :loading="refreshing" @click="refreshCatalog">
            <RefreshCw class="size-3.5" aria-hidden="true" />
            Refresh catalog counts
          </AppButton>
          <p class="text-xs text-ink-faint leading-relaxed pt-2 border-t border-border">
            <Database class="inline size-3 mr-1 align-text-bottom" aria-hidden="true" />
            Deploy Firestore rules from the project
            <code class="text-[10px]">firestore.rules</code>
            (Firebase Console → Firestore → Rules, or
            <code class="text-[10px]">firebase deploy --only firestore</code>)
            so Stock In / Allocate / Transfer can write live inventory.
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>
