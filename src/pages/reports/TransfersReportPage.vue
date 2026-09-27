<script setup lang="ts">
import ReportWorkspace from '@/components/reports/ReportWorkspace.vue'
</script>

<template>
  <ReportWorkspace
    report-type="transfer"
    title="Stock Transfer Reports"
    description="Inter-location movement vouchers with source, destination, batches, and quantities."
    crumb="Transfers"
    location-label="From or To location"
    empty-title="No transfer documents"
    empty-description="Finalize a stock transfer to archive movement reports here."
  />
</template>
