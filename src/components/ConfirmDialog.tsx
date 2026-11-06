import { useEffect, useId, useRef } from 'react'
import { dangerButtonClass, secondaryButtonClass } from '../lib/ui.ts'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(28rem,calc(100%-2rem))] rounded-lg border border-slate-200 bg-white p-6 text-slate-900 backdrop:bg-slate-900/50"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-3 text-base text-slate-700">{description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          className={danger ? dangerButtonClass : secondaryButtonClass}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? 'Working...' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
