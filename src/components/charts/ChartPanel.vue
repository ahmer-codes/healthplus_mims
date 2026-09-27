<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  height?: string
}>()
</script>

<template>
  <section class="surface-panel overflow-hidden flex flex-col min-h-0">
    <div
      v-if="title || description || $slots.actions"
      class="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"
    >
      <div class="min-w-0">
        <h2 v-if="title" class="text-sm font-semibold text-ink">{{ title }}</h2>
        <p v-if="description" class="text-xs text-ink-muted mt-0.5 leading-relaxed">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div
      class="relative flex-1 px-3 py-3 sm:px-4 sm:py-4 touch-manipulation"
      :style="{ minHeight: height ?? '14rem' }"
    >
      <slot />
    </div>
  </section>
</template>
