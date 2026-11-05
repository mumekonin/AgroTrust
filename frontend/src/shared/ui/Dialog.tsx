import type { ReactNode } from 'react'

export function Dialog({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="dialog" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog__bar">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="admin__text-btn" onClick={onClose}>
            {closeLabel}
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
