<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { BreadcrumbItem } from '@/composables'

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<template>
  <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-ink-muted">
    <template v-for="(item, index) in items" :key="`${item.label}-${index}`">
      <span v-if="index > 0" class="text-ink-faint" aria-hidden="true">/</span>
      <RouterLink
        v-if="item.to && index < items.length - 1"
        :to="item.to"
        class="hover:text-brand-600 transition-colors"
      >
        {{ item.label }}
      </RouterLink>
      <span v-else :class="index === items.length - 1 ? 'text-ink-secondary font-medium' : ''">
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>
