<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import type { ExpiryMedicineQuantity, ExpiryWatchStatus } from '@/services'
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
  items: ExpiryMedicineQuantity[]
}>()

const theme = useChartTheme()
const { isCompact, isTouch } = useChartViewport()

const chartData = computed<ChartData<'bar'>>(() => {
  const t = theme.value
  const bandColors: Record<ExpiryWatchStatus, string> = {
    expired: t.danger,
    critical: t.isDark ? '#e0a04a' : '#b45309',
    expiring_soon: t.isDark ? '#c4a574' : '#a16207',
    upcoming: t.isDark ? '#8b93a3' : '#64748b',
  }

  return {
    labels: props.items.map((item) => {
      const name = item.medicineName
      return name.length > 26 ? `${name.slice(0, 24)}…` : name
    }),
    datasets: [
      {
        label: 'Expired',
        data: props.items.map((item) => item.byStatus.expired),
        backgroundColor: bandColors.expired,
        borderRadius: 3,
        barThickness: isTouch.value ? 18 : 14,
        stack: 'qty',
      },
      {
        label: 'Critical',
        data: props.items.map((item) => item.byStatus.critical),
        backgroundColor: bandColors.critical,
        borderRadius: 3,
        barThickness: isTouch.value ? 18 : 14,
        stack: 'qty',
      },
      {
        label: 'Expiring Soon',
        data: props.items.map((item) => item.byStatus.expiring_soon),
        backgroundColor: bandColors.expiring_soon,
        borderRadius: 3,
        barThickness: isTouch.value ? 18 : 14,
        stack: 'qty',
      },
      {
        label: 'Upcoming',
        data: props.items.map((item) => item.byStatus.upcoming),
        backgroundColor: bandColors.upcoming,
        borderRadius: 3,
        barThickness: isTouch.value ? 18 : 14,
        stack: 'qty',
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
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: touch ? 12 : 10,
          boxHeight: touch ? 12 : 10,
          color: t.muted,
          font: { size: touch ? 12 : 11, family: chartFont.family },
          padding: touch ? 16 : 14,
        },
      },
      tooltip: {
        ...cursorTooltip(t, { touch }),
        callbacks: {
          footer: (items) => {
            const total = items.reduce((sum, item) => sum + Number(item.raw ?? 0), 0)
            return `Total qty: ${total}`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: t.grid },
        ticks: {
          color: t.muted,
          font: { size: touch ? 11 : 10, family: chartFont.family },
        },
        border: { display: false },
        title: {
          display: !isCompact.value,
          text: 'Remaining quantity',
          color: t.muted,
          font: { size: 11, family: chartFont.family },
        },
      },
      y: {
        stacked: true,
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
