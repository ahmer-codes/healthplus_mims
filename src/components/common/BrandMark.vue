<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
  tone?: 'brand' | 'inverse' | 'chrome'
}>()
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    :class="{
      'size-7 rounded-[var(--radius-sm)]': size === 'sm' || !size,
      'size-9 rounded-[var(--radius-md)]': size === 'md',
      'size-11 rounded-[var(--radius-md)]': size === 'lg',
      'bg-primary text-primary-foreground': tone === 'brand' || !tone,
      'bg-white/15 text-white': tone === 'inverse',
      'bg-primary text-white': tone === 'chrome',
    }"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      :class="{
        'size-3.5': size === 'sm' || !size,
        'size-4.5': size === 'md',
        'size-5': size === 'lg',
      }"
    >
      <path d="M6.5 2h3v4.5H14v3H9.5V14h-3V9.5H2v-3h4.5V2z" />
    </svg>
  </span>
</template>
