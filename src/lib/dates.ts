export function formatSurveyDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function localDay(value: string): number | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function inputDay(value: string): number | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(year, month - 1, day).getTime()
}

export function matchesCreatedDate(
  createdAt: string,
  from: string,
  to: string,
): boolean {
  const created = localDay(createdAt)
  if (created === null) return false
  const start = inputDay(from)
  const end = inputDay(to)
  if (start !== null && created < start) return false
  if (end !== null && created > end) return false
  return true
}
