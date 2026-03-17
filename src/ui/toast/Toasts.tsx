import { useToast } from './ToastContext'
import { useTranslation } from 'react-i18next'

export function Toasts() {
  const { t: tr } = useTranslation()
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`}>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-message">{toast.message}</div>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label={tr('adDetails.dragLightboxClose')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

