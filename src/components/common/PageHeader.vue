<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 text-sm text-ink-muted max-w-2xl">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
