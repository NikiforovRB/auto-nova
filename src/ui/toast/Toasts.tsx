import { useToast } from './ToastContext'

export function Toasts() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.variant}`}>
          <div className="toast-content">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

