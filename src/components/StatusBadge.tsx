import type { SurveyStatus } from '../lib/types.ts'

const labels: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
}

const classes: Record<SurveyStatus, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-800',
  active: 'border-green-700 bg-green-50 text-green-900',
  closed: 'border-amber-700 bg-amber-50 text-amber-950',
  archived: 'border-slate-500 bg-white text-slate-700',
}

type StatusBadgeProps = {
  status: SurveyStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ${classes[status]}`}
    >
      {labels[status]}
    </span>
  )
}
