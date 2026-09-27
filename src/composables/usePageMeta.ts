import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

export interface BreadcrumbItem {
  label: string
  to?: string
}

/**
 * Page chrome: title, subtitle, breadcrumbs.
 * Pages call setPageMeta() from onMounted / when route context changes.
 */
export function usePageMeta() {
  const title = ref('')
  const subtitle = ref('')
  const breadcrumbs = ref<BreadcrumbItem[]>([])

  function setPageMeta(meta: {
    title: string
    subtitle?: string
    breadcrumbs?: BreadcrumbItem[]
  }) {
    title.value = meta.title
    subtitle.value = meta.subtitle ?? ''
    breadcrumbs.value = meta.breadcrumbs ?? []
  }

  function clearPageMeta() {
    title.value = ''
    subtitle.value = ''
    breadcrumbs.value = []
  }

  return {
    title,
    subtitle,
    breadcrumbs,
    setPageMeta,
    clearPageMeta,
  }
}

/** Shared reactive page meta used by AppHeader / AppBreadcrumbs. */
const pageTitle = ref('Dashboard')
const pageSubtitle = ref('')
const pageBreadcrumbs = ref<BreadcrumbItem[]>([])

export function useAppPage() {
  const route = useRoute()

  function setPage(meta: {
    title: string
    subtitle?: string
    breadcrumbs?: BreadcrumbItem[]
  }) {
    pageTitle.value = meta.title
    pageSubtitle.value = meta.subtitle ?? ''
    pageBreadcrumbs.value = meta.breadcrumbs ?? [{ label: meta.title }]
  }

  onMounted(() => {
    const metaTitle = typeof route.meta.title === 'string' ? route.meta.title : ''
    if (metaTitle) {
      pageTitle.value = metaTitle
    }
  })

  return {
    pageTitle,
    pageSubtitle,
    pageBreadcrumbs,
    setPage,
  }
}

export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function onChange(event: MediaQueryListEvent) {
    matches.value = event.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
  })

  return matches
}
