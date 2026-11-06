import type {
  ChoiceResult,
  Question,
  QuestionResult,
  ResponseRow,
  SurveyResults,
  Survey,
} from './types.ts'

export function percentage(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 1000) / 10
}

export function buildQuestionResults(
  questions: Question[],
  responses: ResponseRow[],
): QuestionResult[] {
  const responseCount = responses.length

  return [...questions]
    .sort((left, right) => left.position - right.position)
    .map((question) => {
      const choices = [...question.choices].sort(
        (left, right) => left.position - right.position,
      )
      const counts = new Map<string, number>()
      let answeredCount = 0

      for (const response of responses) {
        const answer = response.answers.find(
          (item) => item.questionId === question.id && item.choiceId,
        )
        if (!answer?.choiceId) continue
        answeredCount += 1
        counts.set(answer.choiceId, (counts.get(answer.choiceId) ?? 0) + 1)
      }

      const choiceResults: ChoiceResult[] = choices.map((choice) => {
        const count = counts.get(choice.id) ?? 0
        return {
          choiceId: choice.id,
          choiceText: choice.choiceText,
          count,
          percentage: percentage(count, answeredCount),
        }
      })

      return {
        questionId: question.id,
        questionText: question.questionText,
        position: question.position,
        answeredCount,
        unansweredCount: Math.max(responseCount - answeredCount, 0),
        choices: choiceResults,
      }
    })
}

export function buildSurveyResults(
  survey: Survey,
  questions: Question[],
  responses: ResponseRow[],
): SurveyResults {
  return {
    survey,
    responseCount: responses.length,
    questions: buildQuestionResults(questions, responses),
    responses,
  }
}
