<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import type { LocationStockItem } from '@/types'
import {
  chartEvents,
  chartFont,
  chartHoverCursor,
  cursorTooltip,
  ensureChartJs,
  pointerInteraction,
  useChartTheme,
  useChartViewport,
} from './chart-setup'

ensureChartJs()

const props = defineProps<{
  items: LocationStockItem[]
}>()

const theme = useChartTheme()
const { isCompact, isTouch } = useChartViewport()

const chartData = computed<ChartData<'doughnut'>>(() => {
  const t = theme.value
  const palette = [
    t.brand,
    t.allocation,
    t.available,
    t.warning,
    t.neutral,
    t.isDark ? '#f07889' : '#7a1427',
    t.secondary,
    t.muted,
  ]
  return {
    labels: props.items.map((item) => item.locationName),
    datasets: [
      {
        data: props.items.map((item) => item.quantity),
        backgroundColor: props.items.map((_, index) => palette[index % palette.length]!),
        borderWidth: isTouch.value ? 3 : 2,
        borderColor: t.surface,
        // Subtle lift only — large hoverOffset + tooltip feels jumpy.
        hoverOffset: isTouch.value ? 6 : 2,
        hoverBorderWidth: isTouch.value ? 3 : 2,
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'doughnut'>>(() => {
  const t = theme.value
  const touch = isTouch.value
  const compact = isCompact.value

  return {
    responsive: true,
    maintainAspectRatio: false,
    // Thicker ring on phones/tablets = easier to tap thin slices.
    cutout: touch || compact ? '52%' : '62%',
    layout: {
      padding: touch ? 8 : 4,
    },
    events: chartEvents(),
    interaction: pointerInteraction({ touch }),
    onHover: chartHoverCursor(),
    // No slice-pop animation while the tooltip tracks the cursor.
    animation: false,
    transitions: {
      active: { animation: { duration: 0 } },
    },
    plugins: {
      legend: {
        display: true,
        position: compact ? 'bottom' : 'right',
        align: compact ? 'center' : 'center',
        labels: {
          boxWidth: touch ? 10 : 8,
          boxHeight: touch ? 10 : 8,
          padding: touch ? 14 : 10,
          color: t.secondary,
          font: { size: touch ? 12 : 11, family: chartFont.family },
          usePointStyle: false,
        },
        onClick(_e, legendItem, legend) {
          const index = legendItem.index
          if (index == null) return
          const meta = legend.chart.getDatasetMeta(0)
          const el = meta.data[index]
          if (!el) return
          const slice = el as { hidden?: boolean }
          slice.hidden = !slice.hidden
          legend.chart.update()
        },
      },
      tooltip: {
        ...cursorTooltip(t, { touch }),
        callbacks: {
          // Title already shows the location — body is quantity only.
          label(ctx) {
            const value = typeof ctx.parsed === 'number' ? ctx.parsed : ctx.raw
            return ` ${value}`
          },
        },
      },
    },
  }
})
</script>

<template>
  <div class="h-full min-h-[12rem] touch-manipulation [&_canvas]:touch-manipulation">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>
