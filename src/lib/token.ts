const TOKEN_KEY = 'classroom-survey-anonymous-token'
const SUBMITTED_KEY = 'classroom-survey-submitted-surveys'

function readSubmittedIds(): string[] {
  const raw = localStorage.getItem(SUBMITTED_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function getAnonymousToken(): string {
  const existing = localStorage.getItem(TOKEN_KEY)
  if (
    existing &&
    existing.length >= 16 &&
    existing.length <= 128 &&
    existing === existing.trim()
  ) {
    return existing
  }
  const token = crypto.randomUUID()
  localStorage.setItem(TOKEN_KEY, token)
  return token
}

export function hasSubmittedSurvey(surveyId: string): boolean {
  return readSubmittedIds().includes(surveyId)
}

export function rememberSubmittedSurvey(surveyId: string): void {
  const ids = readSubmittedIds()
  if (!ids.includes(surveyId)) {
    ids.push(surveyId)
    localStorage.setItem(SUBMITTED_KEY, JSON.stringify(ids))
  }
}
