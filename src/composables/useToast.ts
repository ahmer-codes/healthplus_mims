import { useToastStore, type ToastVariant } from '@/stores'

export function useToast() {
  const store = useToastStore()

  function show(title: string, options?: { message?: string; variant?: ToastVariant; duration?: number }) {
    return store.push({
      title,
      message: options?.message,
      variant: options?.variant ?? 'info',
      duration: options?.duration,
    })
  }

  return {
    show,
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
    dismiss: store.dismiss,
  }
}
