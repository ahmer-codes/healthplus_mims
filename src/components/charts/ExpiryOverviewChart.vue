<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import type { ExpiryOverviewItem } from '@/types'
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
  items: ExpiryOverviewItem[]
}>()

const theme = useChartTheme()
const { isTouch } = useChartViewport()

const chartData = computed<ChartData<'bar'>>(() => {
  const t = theme.value
  return {
    labels: props.items.map((item) => {
      const name = item.medicineName
      return name.length > 28 ? `${name.slice(0, 26)}…` : name
    }),
    datasets: [
      {
        label: 'Qty approaching expiry',
        data: props.items.map((item) => item.quantity),
        backgroundColor: props.items.map((item) =>
          item.daysUntilExpiry <= 30
            ? t.brand
            : t.isDark
              ? 'rgba(232, 90, 111, 0.55)'
              : 'rgba(196, 30, 58, 0.45)',
        ),
        borderRadius: 4,
        barThickness: isTouch.value ? 20 : 16,
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'bar'>>(() => {
  const t = theme.value
  const touch = isTouch.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    events: chartEvents(),
    interaction: pointerInteraction({ touch }),
    onHover: chartHoverCursor(),
    plugins: {
      legend: { display: false },
      tooltip: cursorTooltip(t, { touch }),
    },
    scales: {
      x: {
        grid: { color: t.grid },
        ticks: {
          color: t.muted,
          font: { size: touch ? 11 : 10, family: chartFont.family },
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: t.ink,
          font: { size: touch ? 12 : 11, family: chartFont.family },
        },
        border: { display: false },
      },
    },
  }
})
</script>

<template>
  <div class="h-full touch-manipulation [&_canvas]:touch-manipulation">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
