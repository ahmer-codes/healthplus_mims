<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import type { MovementPoint } from '@/types'
import {
  chartEvents,
  chartFont,
  chartHoverCursor,
  cursorTooltip,
  ensureChartJs,
  useChartTheme,
  useChartViewport,
} from './chart-setup'

ensureChartJs()

const props = defineProps<{
  series: MovementPoint[]
}>()

const theme = useChartTheme()
const { isTouch } = useChartViewport()

const chartData = computed<ChartData<'line'>>(() => {
  const t = theme.value
  const touch = isTouch.value
  return {
    labels: props.series.map((point) => point.label),
    datasets: [
      {
        label: 'Stock In',
        data: props.series.map((point) => point.stockIn),
        borderColor: t.stockIn,
        backgroundColor: t.brandSoft,
        fill: true,
        tension: 0.35,
        pointRadius: touch ? 3 : 0,
        pointHoverRadius: touch ? 6 : 4,
        pointHitRadius: touch ? 16 : 8,
        borderWidth: 2,
      },
      {
        label: 'Allocation',
        data: props.series.map((point) => point.allocation),
        borderColor: t.allocation,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        pointRadius: touch ? 3 : 0,
        pointHoverRadius: touch ? 6 : 4,
        pointHitRadius: touch ? 16 : 8,
        borderWidth: 2,
      },
      {
        label: 'Transfer',
        data: props.series.map((point) => point.transfer),
        borderColor: t.transfer,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        pointRadius: touch ? 3 : 0,
        pointHoverRadius: touch ? 6 : 4,
        pointHitRadius: touch ? 16 : 8,
        borderWidth: 2,
        borderDash: [4, 3],
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const t = theme.value
  const touch = isTouch.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    events: chartEvents(),
    interaction: {
      mode: 'index',
      intersect: false,
      axis: 'x',
    },
    onHover: chartHoverCursor(),
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 10,
          boxHeight: 2,
          color: t.muted,
          font: { size: touch ? 12 : 11, family: chartFont.family },
          padding: touch ? 12 : 8,
        },
      },
      tooltip: {
        ...cursorTooltip(t, { touch }),
        // Line charts: follow X under finger, stay within chart bounds via mouseout dismiss.
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: t.muted,
          font: { size: touch ? 11 : 10, family: chartFont.family },
          maxRotation: 0,
        },
        border: { color: t.grid },
      },
      y: {
        grid: { color: t.grid },
        ticks: {
          color: t.muted,
          font: { size: touch ? 11 : 10, family: chartFont.family },
        },
        border: { display: false },
      },
    },
  }
})
</script>

<template>
  <div class="h-full touch-manipulation [&_canvas]:touch-manipulation">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
