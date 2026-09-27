import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  duration: number
}

let toastSeq = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])

  function push(input: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) {
    const id = `toast-${++toastSeq}`
    const item: ToastItem = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant,
      duration: input.duration ?? 4000,
    }
    toasts.value = [...toasts.value, item]
    return id
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(title: string, message?: string) {
    return push({ title, message, variant: 'success' })
  }

  function error(title: string, message?: string) {
    return push({ title, message, variant: 'error' })
  }

  function warning(title: string, message?: string) {
    return push({ title, message, variant: 'warning' })
  }

  function info(title: string, message?: string) {
    return push({ title, message, variant: 'info' })
  }

  return { toasts, push, dismiss, success, error, warning, info }
})
