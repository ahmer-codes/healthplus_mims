<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: 'Loading…',
  },
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-ink-muted animate-[fade-in_220ms_var(--ease-out)]"
    role="status"
  >
    <span class="relative flex size-9 items-center justify-center" aria-hidden="true">
      <span class="absolute inset-0 rounded-full border-2 border-border opacity-60" />
      <span
        class="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
        style="animation-duration: 0.7s"
      />
    </span>
    <p class="text-sm tracking-tight">{{ label }}</p>
  </div>
</template>
