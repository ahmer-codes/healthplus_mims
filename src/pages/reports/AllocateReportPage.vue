<script setup lang="ts">
import ReportWorkspace from '@/components/reports/ReportWorkspace.vue'
</script>

<template>
  <ReportWorkspace
    report-type="allocation"
    title="Allocation Reports"
    description="Department issue vouchers with destinations, receivers, medicines, and quantities."
    crumb="Allocate"
    location-label="Destination"
    empty-title="No allocation documents"
    empty-description="Finalize an allocation to archive department issue reports here."
  />
</template>
