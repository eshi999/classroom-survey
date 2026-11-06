import { describe, expect, it } from 'vitest'
import { buildResultsCsv, escapeCsvCell } from './csv.ts'
import type { SurveyResults } from './types.ts'

describe('escapeCsvCell', () => {
  it('quotes commas and doubles quotes', () => {
    expect(escapeCsvCell('Hello, "class"')).toBe('"Hello, ""class"""')
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`)
    expect(escapeCsvCell('+sum(A1)')).toBe(`"'+sum(A1)"`)
    expect(escapeCsvCell('-2')).toBe(`"'-2"`)
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`)
  })
})

describe('buildResultsCsv', () => {
  it('puts metadata first and one row per response', () => {
    const results: SurveyResults = {
      survey: {
        id: 's1',
        title: 'Recursion',
        description: 'Quick check',
        status: 'closed',
        publicSlug: 'abcdef123456',
        createdAt: '2026-08-17T12:00:00Z',
        updatedAt: '2026-08-17T12:00:00Z',
      },
      responseCount: 1,
      questions: [
        {
          questionId: 'q1',
          questionText: 'Base case?',
          position: 1,
          answeredCount: 1,
          unansweredCount: 0,
          choices: [
            { choiceId: 'c1', choiceText: 'Yes', count: 1, percentage: 100 },
          ],
        },
      ],
      responses: [
        {
          id: 'r1',
          submittedAt: '2026-08-17T12:10:00Z',
          answers: [{ questionId: 'q1', choiceId: 'c1' }],
        },
      ],
    }
    const csv = buildResultsCsv(results, '2026-08-17T13:00:00Z')
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"title","Recursion"')
    expect(csv).toContain('"response_id","submitted_at","Base case?"')
    expect(csv).toContain('"r1","2026-08-17T12:10:00Z","Yes"')
  })
})
