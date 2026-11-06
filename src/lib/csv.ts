import type { SurveyResults } from './types.ts'

const FORMULA_PREFIX = /^[=+\-@\t]/

export function escapeCsvCell(value: string): string {
  let cell = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (FORMULA_PREFIX.test(cell)) {
    cell = `'${cell}`
  }
  return `"${cell.replace(/"/g, '""')}"`
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')
}

export function buildResultsCsv(
  results: SurveyResults,
  exportedAt: string,
): string {
  const questions = [...results.questions].sort(
    (left, right) => left.position - right.position,
  )
  const choiceText = new Map<string, string>()
  for (const question of questions) {
    for (const choice of question.choices) {
      choiceText.set(choice.choiceId, choice.choiceText)
    }
  }

  const header = [
    'response_id',
    'submitted_at',
    ...questions.map((question) => question.questionText),
  ]
  const body = [...results.responses]
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
    .map((response) => {
      const answers = questions.map((question) => {
        const answer = response.answers.find(
          (item) => item.questionId === question.questionId,
        )
        if (!answer?.choiceId) return ''
        return choiceText.get(answer.choiceId) ?? ''
      })
      return [response.id, response.submittedAt, ...answers]
    })

  const metadata = [
    ['title', results.survey.title],
    ['description', results.survey.description ?? ''],
    ['status', results.survey.status],
    ['exported_at', exportedAt],
    ['response_count', String(results.responseCount)],
  ]

  return `\uFEFF${toCsv([...metadata, [], header, ...body])}`
}

export function csvFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'survey'}-results.csv`
}
