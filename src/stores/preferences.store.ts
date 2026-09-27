import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type DensityMode = 'comfortable' | 'compact'

const STORAGE_KEY = 'healthplus.preferences.v1'

interface PreferencesState {
  theme: ThemeMode
  density: DensityMode
  reduceMotion: boolean
  notifyExpiry: boolean
  notifyLowStock: boolean
  notifyDemands: boolean
}

function readStored(): PreferencesState {
  const defaults: PreferencesState = {
    theme: 'system',
    density: 'comfortable',
    reduceMotion: false,
    notifyExpiry: true,
    notifyLowStock: true,
    notifyDemands: true,
  }
  if (typeof localStorage === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<PreferencesState>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

function applyDensity(density: DensityMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.density = density
}

function applyReduceMotion(reduce: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('reduce-motion', reduce)
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = readStored()
  const theme = ref<ThemeMode>(initial.theme)
  const density = ref<DensityMode>(initial.density)
  const reduceMotion = ref(initial.reduceMotion)
  const notifyExpiry = ref(initial.notifyExpiry)
  const notifyLowStock = ref(initial.notifyLowStock)
  const notifyDemands = ref(initial.notifyDemands)
  /** Bumps whenever the resolved theme class changes (for chart redraws, etc.). */
  const themeEpoch = ref(0)
  const systemDark = ref(systemPrefersDark())

  const resolvedDark = computed(
    () => theme.value === 'dark' || (theme.value === 'system' && systemDark.value),
  )

  function persist() {
    if (typeof localStorage === 'undefined') return
    const payload: PreferencesState = {
      theme: theme.value,
      density: density.value,
      reduceMotion: reduceMotion.value,
      notifyExpiry: notifyExpiry.value,
      notifyLowStock: notifyLowStock.value,
      notifyDemands: notifyDemands.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function applyAll() {
    applyTheme(theme.value)
    applyDensity(density.value)
    applyReduceMotion(reduceMotion.value)
    themeEpoch.value += 1
    persist()
  }

  function setTheme(next: ThemeMode) {
    theme.value = next
    applyAll()
  }

  function setDensity(next: DensityMode) {
    density.value = next
    applyAll()
  }

  function setReduceMotion(next: boolean) {
    reduceMotion.value = next
    applyAll()
  }

  function setNotifyExpiry(next: boolean) {
    notifyExpiry.value = next
    persist()
  }

  function setNotifyLowStock(next: boolean) {
    notifyLowStock.value = next
    persist()
  }

  function setNotifyDemands(next: boolean) {
    notifyDemands.value = next
    persist()
  }

  function init() {
    applyAll()
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      systemDark.value = media.matches
      if (theme.value === 'system') {
        applyTheme('system')
        themeEpoch.value += 1
      }
    }
    media.addEventListener('change', onChange)
  }

  watch([theme, density, reduceMotion], () => persist())

  return {
    theme,
    density,
    reduceMotion,
    notifyExpiry,
    notifyLowStock,
    notifyDemands,
    resolvedDark,
    themeEpoch,
    init,
    setTheme,
    setDensity,
    setReduceMotion,
    setNotifyExpiry,
    setNotifyLowStock,
    setNotifyDemands,
  }
})
