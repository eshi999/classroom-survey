import { describe, expect, it } from 'vitest'
import { copyTitle, validateSurvey } from './validation.ts'

describe('validateSurvey', () => {
  it('requires a title, a question, and two filled choices', () => {
    const errors = validateSurvey({
      title: '   ',
      description: '',
      questions: [
        {
          text: '',
          type: 'multiple_choice',
          choices: [{ text: 'Only one' }],
        },
      ],
    })
    expect(errors).toContain('Enter a survey title.')
    expect(errors).toContain('Question 1 needs question text.')
    expect(errors).toContain('Question 1 needs at least two choices.')
  })

  it('accepts a true or false question', () => {
    expect(
      validateSurvey({
        title: 'Check',
        description: '',
        questions: [
          {
            text: 'A base case is required.',
            type: 'true_false',
            choices: [{ text: 'True' }, { text: 'False' }],
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('copyTitle', () => {
  it('prefixes the original title', () => {
    expect(copyTitle(' Recursion ')).toBe('Copy of Recursion')
  })
})
