import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle, Info, WarningCircle } from '@phosphor-icons/react'

type Kind = 'success' | 'error' | 'info'
type Options = { kind?: Kind; action?: { label: string; onClick: () => void }; duration?: number }
type ToastState = { id: number; message: string } & Options

const ToastContext = createContext<(message: string, options?: Options) => void>(() => {})

const ICONS = { success: CheckCircle, error: WarningCircle, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((message: string, options: Options = {}) => {
    window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, ...options })
    timer.current = window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), options.duration ?? (options.action ? 5000 : 3000))
  }, [])

  const Icon = toast ? ICONS[toast.kind ?? 'success'] : null

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Polite live region: announced to screen readers without stealing focus. */}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && Icon && (
          <div className="toast" key={toast.id}>
            <Icon size={20} weight="fill" aria-hidden />
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action!.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
