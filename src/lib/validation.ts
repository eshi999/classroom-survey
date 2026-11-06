import type { SurveyInput } from './types.ts'

export function validateSurvey(input: SurveyInput): string[] {
  const errors: string[] = []
  if (input.title.trim().length === 0) {
    errors.push('Enter a survey title.')
  }
  if (input.questions.length === 0) {
    errors.push('Add at least one question.')
  }

  input.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`
    if (question.text.trim().length === 0) {
      errors.push(`${label} needs question text.`)
    }
    if (question.type === 'multiple_choice') {
      if (question.choices.length < 2) {
        errors.push(`${label} needs at least two choices.`)
      }
      if (question.choices.some((choice) => choice.text.trim().length === 0)) {
        errors.push(`${label} has an empty choice.`)
      }
    }
    if (question.type === 'true_false') {
      const labels = question.choices.map((choice) => choice.text.trim())
      if (
        labels.length !== 2 ||
        labels[0] !== 'True' ||
        labels[1] !== 'False'
      ) {
        errors.push(`${label} must offer True and False.`)
      }
    }
  })

  return errors
}

export function trueFalseChoices(): SurveyInput['questions'][number]['choices'] {
  return [{ text: 'True' }, { text: 'False' }]
}

export function copyTitle(title: string): string {
  return `Copy of ${title.trim()}`
}
