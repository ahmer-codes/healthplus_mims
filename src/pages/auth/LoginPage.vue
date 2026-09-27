<script setup lang="ts">
import {
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
  Lock,
  Package,
  ShieldCheck,
} from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import BrandMark from '@/components/common/BrandMark.vue'
import { APP_NAME, HOSPITAL_NAME } from '@/constants'
import { useAuth } from '@/composables'

const { login, loading, error, clearError } = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailError = ref('')
const passwordError = ref('')
const submitted = ref(false)

const features = [
  {
    icon: Package,
    title: 'Stock & batch control',
    description: 'Receive, allocate, and transfer lots with FEFO awareness.',
  },
  {
    icon: BarChart3,
    title: 'Operational reports',
    description: 'Printable vouchers and stock movement history for audit.',
  },
  {
    icon: ClipboardList,
    title: 'Ward demands',
    description: 'Track medicine requests against available hospital stock.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'Authenticated sessions with structured permissions.',
  },
] as const

const formError = computed(() => error.value)

watch([email, password], () => {
  if (submitted.value) {
    emailError.value = email.value.trim() ? '' : 'Email is required.'
    passwordError.value = password.value ? '' : 'Password is required.'
  }
  if (error.value) clearError()
})

function validate(): boolean {
  emailError.value = email.value.trim() ? '' : 'Email is required.'
  passwordError.value = password.value ? '' : 'Password is required.'
  return !emailError.value && !passwordError.value
}

async function onSubmit() {
  submitted.value = true
  clearError()
  if (!validate()) return
  await login(email.value, password.value)
}

/* ── Soft shade that follows the cursor, then eases home ───────── */
const narrativeRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const CELL = 40
/** Home position of the shade (matches the original top-right glow). */
const HOME = { xRatio: 0.82, yRatio: 0.12 }
/** Lerp factor per frame (~60fps): higher = snappier, lower = silkier. */
const FOLLOW = 0.085
const RETURN = 0.055
const SETTLE = 0.4

let panelW = 0
let panelH = 0
let homeX = 0
let homeY = 0
let glowX = 0
let glowY = 0
let targetX = 0
let targetY = 0
let tracking = false
let rafId = 0
let running = false
let prefersReducedMotion = false

function homePoint() {
  homeX = panelW * HOME.xRatio
  homeY = panelH * HOME.yRatio
}

function resizeCanvas() {
  const panel = narrativeRef.value
  const canvas = canvasRef.value
  if (!panel || !canvas) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const { width, height } = panel.getBoundingClientRect()
  panelW = width
  panelH = height
  homePoint()

  if (!tracking) {
    glowX = homeX
    glowY = homeY
    targetX = homeX
    targetY = homeY
  }

  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  paint()
}

function paint() {
  const canvas = canvasRef.value
  if (!canvas || !panelW || !panelH) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, panelW, panelH)

  // Grid lines only (no filled cells)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)'
  ctx.lineWidth = 1
  for (let x = 0; x <= panelW; x += CELL) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, panelH)
    ctx.stroke()
  }
  for (let y = 0; y <= panelH; y += CELL) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(panelW, y + 0.5)
    ctx.stroke()
  }

  // Soft diffuse shade (same look as the original static glow)
  const radius = Math.max(panelW, panelH) * 0.48
  const shade = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius)
  shade.addColorStop(0, 'rgba(196, 30, 58, 0.22)')
  shade.addColorStop(0.35, 'rgba(196, 30, 58, 0.1)')
  shade.addColorStop(0.7, 'rgba(196, 30, 58, 0.03)')
  shade.addColorStop(1, 'rgba(196, 30, 58, 0)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, panelW, panelH)
}

function tick() {
  rafId = 0
  const ease = tracking ? FOLLOW : RETURN
  glowX += (targetX - glowX) * ease
  glowY += (targetY - glowY) * ease
  paint()

  const dx = targetX - glowX
  const dy = targetY - glowY
  const settled = !tracking && dx * dx + dy * dy < SETTLE * SETTLE

  if (settled) {
    glowX = homeX
    glowY = homeY
    paint()
    running = false
    return
  }

  rafId = requestAnimationFrame(tick)
}

function ensureLoop() {
  if (prefersReducedMotion || running) return
  running = true
  rafId = requestAnimationFrame(tick)
}

function onPointerMove(event: PointerEvent) {
  const panel = narrativeRef.value
  if (!panel || prefersReducedMotion) return
  const rect = panel.getBoundingClientRect()
  tracking = true
  targetX = event.clientX - rect.left
  targetY = event.clientY - rect.top
  ensureLoop()
}

function onPointerLeave() {
  tracking = false
  targetX = homeX
  targetY = homeY
  ensureLoop()
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resizeCanvas()
  glowX = homeX
  glowY = homeY
  targetX = homeX
  targetY = homeY
  paint()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (rafId) cancelAnimationFrame(rafId)
  running = false
})
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2 overflow-x-hidden">
    <!-- Narrative + interactive grid (half) -->
    <section
      ref="narrativeRef"
      class="relative hidden lg:flex flex-col justify-between overflow-hidden bg-chrome px-10 xl:px-14 py-10 text-white"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <canvas
        ref="canvasRef"
        class="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div class="relative flex items-center gap-3">
        <BrandMark tone="inverse" size="md" />
        <div>
          <p class="text-display text-base font-semibold tracking-tight">{{ HOSPITAL_NAME }}</p>
          <p class="text-xs text-chrome-muted">{{ APP_NAME }}</p>
        </div>
      </div>

      <div class="relative max-w-xl">
        <h1
          class="text-display text-[2rem] xl:text-[2.35rem] font-semibold leading-[1.15] tracking-tight"
        >
          Efficient Inventory. Stronger Healthcare.
        </h1>

        <ul class="mt-9 space-y-5">
          <li v-for="feature in features" :key="feature.title" class="flex gap-3.5">
            <span
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-white/6 text-primary ring-1 ring-white/8"
            >
              <component :is="feature.icon" class="size-3.5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white">{{ feature.title }}</p>
              <p class="text-xs text-chrome-muted leading-relaxed mt-0.5">
                {{ feature.description }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <p class="relative text-[11px] text-chrome-faint">
        © {{ new Date().getFullYear() }} {{ HOSPITAL_NAME }}
      </p>
    </section>

    <!-- Sign-in (half) -->
    <section class="relative flex items-center justify-center px-5 py-10 sm:px-10 bg-surface-muted">
      <div
        class="pointer-events-none absolute inset-0 opacity-40"
        style="
          background-image: radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0);
          background-size: 20px 20px;
        "
        aria-hidden="true"
      />

      <div class="relative w-full max-w-[26rem]">
        <div class="mb-7 flex items-center gap-3 lg:hidden">
          <BrandMark size="sm" />
          <div>
            <p class="text-display text-sm font-semibold text-ink">{{ HOSPITAL_NAME }}</p>
            <p class="text-xs text-ink-muted">{{ APP_NAME }}</p>
          </div>
        </div>

        <div class="surface-panel px-6 py-7 sm:px-8 sm:py-8 shadow-[var(--shadow-sm)]">
          <div class="mb-6">
            <div class="hidden lg:flex items-center gap-2.5 mb-5">
              <BrandMark size="sm" />
              <div>
                <p class="text-display text-sm font-semibold text-ink leading-tight">
                  {{ HOSPITAL_NAME }}
                </p>
                <p class="text-[11px] text-ink-muted">{{ APP_NAME }}</p>
              </div>
            </div>
            <h2 class="text-display text-xl font-semibold text-ink tracking-tight">Sign in</h2>
            <p class="mt-1.5 text-sm text-ink-muted">
              Access the hospital dispensary workspace.
            </p>
          </div>

          <form class="space-y-4" novalidate @submit.prevent="onSubmit">
            <div
              v-if="formError"
              class="rounded-[var(--radius-md)] border border-danger/25 bg-danger-subtle px-3 py-2.5 text-xs text-danger"
              role="alert"
            >
              {{ formError }}
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="login-email" class="text-sm font-medium text-ink">Email</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="username"
                :disabled="loading"
                placeholder="staff@hospital.com"
                class="w-full h-10 px-3 rounded-[var(--radius-md)] border bg-surface text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 disabled:opacity-60"
                :class="emailError ? 'border-danger' : 'border-border hover:border-border-strong'"
              />
              <p v-if="emailError" class="text-xs text-danger">{{ emailError }}</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="login-password" class="text-sm font-medium text-ink">Password</label>
              <div class="relative">
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  :disabled="loading"
                  placeholder="Enter password"
                  class="w-full h-10 pl-3 pr-10 rounded-[var(--radius-md)] border bg-surface text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 disabled:opacity-60"
                  :class="passwordError ? 'border-danger' : 'border-border hover:border-border-strong'"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted hover:text-ink transition-colors"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :disabled="loading"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-4" aria-hidden="true" />
                  <Eye v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
              <p v-if="passwordError" class="text-xs text-danger">{{ passwordError }}</p>
            </div>

            <AppButton type="submit" block :loading="loading" class="mt-1">
              <Lock class="size-3.5" aria-hidden="true" />
              Sign In
            </AppButton>
          </form>
        </div>

        <p class="mt-5 text-center text-[11px] text-ink-faint leading-relaxed lg:hidden">
          Efficient Inventory. Stronger Healthcare.
        </p>
      </div>
    </section>
  </div>
</template>
