import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Toast 타입
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

// 전역 Toast 상태 관리
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]))
}

// Toast 추가 함수 (외부에서 호출)
export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  const newToast: Toast = {
    id,
    duration: 5000,
    ...options,
  }
  
  toasts = [...toasts, newToast]
  notifyListeners()
  
  // 자동 제거
  setTimeout(() => {
    removeToast(id)
  }, newToast.duration)
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  notifyListeners()
}

// 편의 함수
toast.success = (title: string, message?: string) => 
  toast({ type: 'success', title, message })

toast.error = (title: string, message?: string) => 
  toast({ type: 'error', title, message })

toast.warning = (title: string, message?: string) => 
  toast({ type: 'warning', title, message })

toast.info = (title: string, message?: string) => 
  toast({ type: 'info', title, message })


// Toast 컴포넌트
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }
  
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  
  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  }
  
  const Icon = icons[toast.type]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm max-w-md',
        colors[toast.type]
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColors[toast.type])} />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-80 mt-1">{toast.message}</p>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}


// Toaster 컴포넌트
export function Toaster() {
  const [toastList, setToastList] = useState<Toast[]>([])
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToastList(newToasts)
    toastListeners.push(listener)
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])
  
  if (typeof document === 'undefined') return null
  
  return createPortal(
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toastList.map(t => (
          <ToastItem
            key={t.id}
            toast={t}
            onRemove={() => removeToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

