export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'
export type QuestionType = 'multiple_choice' | 'true_false'

export type Choice = {
  id: string
  choiceText: string
  position: number
}

export type Question = {
  id: string
  questionText: string
  questionType: QuestionType
  position: number
  choices: Choice[]
}

export type Survey = {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  publicSlug: string | null
  createdAt: string
  updatedAt: string
}

export type SurveyDetails = Survey & {
  questions: Question[]
}

export type ChoiceInput = {
  text: string
}

export type QuestionInput = {
  text: string
  type: QuestionType
  choices: ChoiceInput[]
}

export type SurveyInput = {
  title: string
  description: string
  questions: QuestionInput[]
}

export type AnswerRow = {
  questionId: string
  choiceId: string | null
}

export type ResponseRow = {
  id: string
  submittedAt: string
  answers: AnswerRow[]
}

export type ChoiceResult = {
  choiceId: string
  choiceText: string
  count: number
  percentage: number
}

export type QuestionResult = {
  questionId: string
  questionText: string
  position: number
  answeredCount: number
  unansweredCount: number
  choices: ChoiceResult[]
}

export type SurveyResults = {
  survey: Survey
  responseCount: number
  questions: QuestionResult[]
  responses: ResponseRow[]
}

export type PublicSurveyStatus =
  | { found: false }
  | { found: true; surveyId: string; status: SurveyStatus; title: string }
