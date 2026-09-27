export interface NavChild {
  label: string
  to: string
}

export interface NavItem {
  label: string
  to?: string
  icon: string
  children?: NavChild[]
}

/**
 * Primary application navigation. hierarchy mirrors dispensary workflows.
 */
export const NAVIGATION: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Stock Management',
    icon: 'Package',
    children: [
      { label: 'Stock In', to: '/stock/stock-in' },
      { label: 'Allocate', to: '/stock/allocate' },
      { label: 'Stock Transfer', to: '/stock/transfer' },
      { label: 'Batch Management', to: '/stock/batches' },
    ],
  },
  {
    label: 'Reports',
    icon: 'FileChartColumn',
    children: [
      { label: 'Stock In Reports', to: '/reports/stock-in' },
      { label: 'Allocation Reports', to: '/reports/allocate' },
      { label: 'Stock Transfer Reports', to: '/reports/transfers' },
    ],
  },
  {
    label: 'Expiry Management',
    to: '/expiry',
    icon: 'CalendarClock',
  },
  {
    label: 'Contacts & Demands',
    icon: 'Handshake',
    children: [
      { label: 'Contacts', to: '/contacts' },
      { label: 'Medicine Demands', to: '/demands' },
    ],
  },
]

export const SECONDARY_NAVIGATION: NavItem[] = [
  {
    label: 'Settings',
    to: '/settings',
    icon: 'Settings',
  },
]
