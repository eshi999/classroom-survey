import { describe, expect, it } from 'vitest'
import { buildQuestionResults, percentage } from './results.ts'
import type { Question, ResponseRow } from './types.ts'

const questions: Question[] = [
  {
    id: 'q1',
    questionText: 'What is required?',
    questionType: 'multiple_choice',
    position: 1,
    choices: [
      { id: 'c1', choiceText: 'A base case', position: 1 },
      { id: 'c2', choiceText: 'A pointer', position: 2 },
    ],
  },
]

describe('percentage', () => {
  it('rounds to one decimal place', () => {
    expect(percentage(45, 52)).toBe(86.5)
    expect(percentage(0, 0)).toBe(0)
  })
})

describe('buildQuestionResults', () => {
  it('counts choices and labels skipped questions', () => {
    const responses: ResponseRow[] = [
      {
        id: 'r1',
        submittedAt: '2026-08-17T12:00:00Z',
        answers: [{ questionId: 'q1', choiceId: 'c1' }],
      },
      {
        id: 'r2',
        submittedAt: '2026-08-17T12:01:00Z',
        answers: [{ questionId: 'q1', choiceId: 'c1' }],
      },
      { id: 'r3', submittedAt: '2026-08-17T12:02:00Z', answers: [] },
    ]
    const [question] = buildQuestionResults(questions, responses)
    expect(question?.answeredCount).toBe(2)
    expect(question?.unansweredCount).toBe(1)
    expect(question?.choices[0]).toMatchObject({ count: 2, percentage: 100 })
    expect(question?.choices[1]).toMatchObject({ count: 0, percentage: 0 })
  })
})
