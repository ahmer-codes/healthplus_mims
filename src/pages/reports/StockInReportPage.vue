<script setup lang="ts">
import ReportWorkspace from '@/components/reports/ReportWorkspace.vue'
</script>

<template>
  <ReportWorkspace
    report-type="stock_in"
    title="Stock In Reports"
    description="Receiving documents with purchase orders, batches, and optional pricing exports."
    crumb="Stock In"
    location-label="Receiving location"
    empty-title="No stock-in documents"
    empty-description="Complete a Stock In finalization to archive receiving reports here."
  />
</template>
