import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Chart,
  type ChartOptions,
  type Plugin,
  type TooltipOptions,
} from 'chart.js'
import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue'
import { usePreferencesStore } from '@/stores/preferences.store'

let registered = false
let positionerReady = false

function registerFollowCursorPositioner(): void {
  if (positionerReady) return
  // Tooltip anchors to the pointer while a slice/bar is active; never floats outside.
  Tooltip.positioners.followCursor = function (_items, eventPosition) {
    return {
      x: eventPosition.x,
      y: eventPosition.y,
    }
  }
  positionerReady = true
}

/** Clears active tooltip when the pointer leaves the chart canvas. */
export const dismissTooltipOutsidePlugin: Plugin = {
  id: 'dismissTooltipOutside',
  afterEvent(chart, args) {
    if (args.event.type !== 'mouseout') return
    // Soft clear — avoid chart.update() which flashes a frame of the old tooltip.
    chart.setActiveElements([])
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 })
    chart.draw()
  },
}

export function ensureChartJs(): void {
  if (registered) return
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
    dismissTooltipOutsidePlugin,
  )
  registerFollowCursorPositioner()
  registered = true
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export type ChartTheme = {
  brand: string
  brandSoft: string
  ink: string
  secondary: string
  muted: string
  faint: string
  grid: string
  surface: string
  tooltipBg: string
  tooltipTitle: string
  tooltipBody: string
  available: string
  warning: string
  hold: string
  danger: string
  neutral: string
  allocation: string
  transfer: string
  stockIn: string
  isDark: boolean
}

/** Resolve chart colors from live CSS tokens (light/dark aware). */
export function getChartTheme(): ChartTheme {
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const brand = cssVar('--color-primary', isDark ? '#e85a6f' : '#c41e3a')
  const ink = cssVar('--color-ink', isDark ? '#f2f4f8' : '#1c1f26')
  const muted = cssVar('--color-ink-muted', isDark ? '#a8b0bd' : '#6b7280')
  const secondary = cssVar('--color-ink-secondary', isDark ? '#d2d7e0' : '#3f4553')
  const faint = cssVar('--color-ink-faint', isDark ? '#8b93a3' : '#9aa1ad')
  const grid = cssVar('--color-border', isDark ? '#2f3642' : '#e8e7e5')
  const surface = cssVar('--color-surface', isDark ? '#161a21' : '#ffffff')
  const chrome = cssVar('--color-chrome', '#16191f')

  return {
    brand,
    brandSoft: isDark ? 'rgba(232, 90, 111, 0.18)' : 'rgba(196, 30, 58, 0.14)',
    ink,
    secondary,
    muted,
    faint,
    grid,
    surface,
    tooltipBg: chrome,
    tooltipTitle: '#ffffff',
    tooltipBody: isDark ? '#d2d7e0' : '#d0d4dc',
    available: cssVar('--color-success', isDark ? '#3dba7a' : '#1a7a4c'),
    warning: cssVar('--color-warning', isDark ? '#e0a04a' : '#a85a0a'),
    hold: cssVar('--color-info', isDark ? '#5aa8d4' : '#1a5f8a'),
    danger: cssVar('--color-danger', brand),
    neutral: cssVar('--color-neutral', muted),
    allocation: cssVar('--color-info', isDark ? '#5aa8d4' : '#1a5f8a'),
    transfer: isDark ? '#c4a574' : '#7a5c2e',
    stockIn: brand,
    isDark,
  }
}

/**
 * Reactive chart theme: recomputes when preferences theme (or system) changes.
 * Include `theme.isDark` / spread `theme` inside chart computeds so Chart.js updates.
 */
export function useChartTheme(): ComputedRef<ChartTheme> {
  const preferences = usePreferencesStore()
  return computed(() => {
    void preferences.resolvedDark
    void preferences.themeEpoch
    return getChartTheme()
  })
}

/** Tracks viewport width for chart layout / touch-friendly sizing. */
export function useChartViewport(): { isCompact: Ref<boolean>; isTouch: Ref<boolean> } {
  const isCompact = ref(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
  )
  const isTouch = ref(
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: none), (pointer: coarse)').matches
      : false,
  )

  let compactMq: MediaQueryList | null = null
  let touchMq: MediaQueryList | null = null
  let onCompact: (() => void) | null = null
  let onTouch: (() => void) | null = null

  onMounted(() => {
    compactMq = window.matchMedia('(max-width: 640px)')
    touchMq = window.matchMedia('(hover: none), (pointer: coarse)')
    onCompact = () => {
      isCompact.value = compactMq!.matches
    }
    onTouch = () => {
      isTouch.value = touchMq!.matches
    }
    onCompact()
    onTouch()
    compactMq.addEventListener('change', onCompact)
    touchMq.addEventListener('change', onTouch)
  })

  onUnmounted(() => {
    if (compactMq && onCompact) compactMq.removeEventListener('change', onCompact)
    if (touchMq && onTouch) touchMq.removeEventListener('change', onTouch)
  })

  return { isCompact, isTouch }
}

/** Shared tooltip that follows the pointer over active elements only. */
export function cursorTooltip(theme: ChartTheme, opts?: { touch?: boolean }): Partial<TooltipOptions> {
  const touch = opts?.touch ?? false
  return {
    enabled: true,
    position: 'followCursor' as never,
    backgroundColor: theme.tooltipBg,
    titleColor: theme.tooltipTitle,
    bodyColor: theme.tooltipBody,
    titleFont: { family: chartFont.family, size: touch ? 13 : 12, weight: 600 },
    bodyFont: { family: chartFont.family, size: touch ? 13 : 12 },
    padding: touch ? 12 : 10,
    cornerRadius: 8,
    caretSize: 5,
    caretPadding: 10,
    displayColors: true,
    boxPadding: 4,
    // Instant reposition while following the cursor — animated fades look janky here.
    animation: false,
    animations: false,
  }
}

export function pointerInteraction(_opts?: { touch?: boolean }): ChartOptions['interaction'] {
  return {
    mode: 'nearest',
    intersect: true,
    axis: 'xy',
    includeInvisible: false,
  }
}

export function chartEvents(): ChartOptions['events'] {
  return ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend']
}

export function chartHoverCursor(): NonNullable<ChartOptions['onHover']> {
  return (_event, elements, chart) => {
    const canvas = chart.canvas
    if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'
  }
}

/** @deprecated Prefer getChartTheme() / useChartTheme() for theme awareness. */
export const chartColors = {
  brand: '#c41e3a',
  brandSoft: 'rgba(196, 30, 58, 0.14)',
  ink: '#1c1f26',
  muted: '#6b7280',
  grid: '#e8e7e5',
  available: '#1a7a4c',
  warning: '#a85a0a',
  hold: '#1a5f8a',
  danger: '#c41e3a',
  neutral: '#5c6474',
  allocation: '#1a5f8a',
  transfer: '#7a5c2e',
  stockIn: '#c41e3a',
} as const

export const chartFont = {
  family: "'DM Sans', sans-serif",
} as const

// Satisfy TS for custom positioner registration without ambient module edits.
declare module 'chart.js' {
  interface TooltipPositionerMap {
    followCursor: (items: unknown[], eventPosition: { x: number; y: number }) => {
      x: number
      y: number
    }
  }
}

export type { Chart }
