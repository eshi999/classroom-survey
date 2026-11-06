import { copyTitle } from './validation.ts'
import { buildSurveyResults } from './results.ts'
import { getSupabaseClient } from './supabase.ts'
import type {
  Choice,
  PublicSurveyStatus,
  Question,
  QuestionType,
  ResponseRow,
  Survey,
  SurveyDetails,
  SurveyInput,
  SurveyResults,
  SurveyStatus,
} from './types.ts'

const SURVEY_WITH_QUESTIONS = `
  id,
  title,
  description,
  status,
  public_slug,
  created_at,
  updated_at,
  questions (
    id,
    question_text,
    question_type,
    position,
    choices (
      id,
      choice_text,
      position
    )
  )
`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isStatus(value: unknown): value is SurveyStatus {
  return (
    value === 'draft' ||
    value === 'active' ||
    value === 'closed' ||
    value === 'archived'
  )
}

function isQuestionType(value: unknown): value is QuestionType {
  return value === 'multiple_choice' || value === 'true_false'
}

function readChoice(value: unknown): Choice | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const choiceText = readString(value.choice_text)
  const position = value.position
  if (!id || !choiceText || typeof position !== 'number') return null
  return { id, choiceText, position }
}

function readQuestion(value: unknown): Question | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const questionText = readString(value.question_text)
  const position = value.position
  if (
    !id ||
    !questionText ||
    !isQuestionType(value.question_type) ||
    typeof position !== 'number'
  ) {
    return null
  }
  const choices = Array.isArray(value.choices)
    ? value.choices.flatMap((choice) => {
        const parsed = readChoice(choice)
        return parsed ? [parsed] : []
      })
    : []
  return {
    id,
    questionText,
    questionType: value.question_type,
    position,
    choices: choices.sort((left, right) => left.position - right.position),
  }
}

function readSurvey(value: unknown): Survey | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const title = readString(value.title)
  const createdAt = readString(value.created_at)
  const updatedAt = readString(value.updated_at)
  if (!id || !title || !isStatus(value.status) || !createdAt || !updatedAt)
    return null
  return {
    id,
    title,
    description: readString(value.description),
    status: value.status,
    publicSlug: readString(value.public_slug),
    createdAt,
    updatedAt,
  }
}

function readSurveyDetails(value: unknown): SurveyDetails | null {
  const survey = readSurvey(value)
  if (!survey || !isRecord(value)) return null
  const questions = Array.isArray(value.questions)
    ? value.questions.flatMap((question) => {
        const parsed = readQuestion(question)
        return parsed ? [parsed] : []
      })
    : []
  return {
    ...survey,
    questions: questions.sort((left, right) => left.position - right.position),
  }
}

function readResponses(value: unknown): ResponseRow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const id = readString(item.id)
    const submittedAt = readString(item.submitted_at)
    if (!id || !submittedAt) return []
    const answers = Array.isArray(item.answers)
      ? item.answers.flatMap((answer) => {
          if (!isRecord(answer)) return []
          const questionId = readString(answer.question_id)
          if (!questionId) return []
          return [{ questionId, choiceId: readString(answer.choice_id) }]
        })
      : []
    return [{ id, submittedAt, answers }]
  })
}

function raiseOnError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function listSurveys(): Promise<Survey[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(
      'id, title, description, status, public_slug, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
  raiseOnError(error)
  return Array.isArray(data)
    ? data.flatMap((item) => {
        const survey = readSurvey(item)
        return survey ? [survey] : []
      })
    : []
}

export async function listResponseCounts(): Promise<Record<string, number>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('responses').select('survey_id')
  raiseOnError(error)
  const counts: Record<string, number> = {}
  if (!Array.isArray(data)) return counts
  for (const row of data) {
    if (!isRecord(row)) continue
    const surveyId = readString(row.survey_id)
    if (!surveyId) continue
    counts[surveyId] = (counts[surveyId] ?? 0) + 1
  }
  return counts
}

export async function getSurvey(id: string): Promise<SurveyDetails | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_WITH_QUESTIONS)
    .eq('id', id)
    .maybeSingle()
  raiseOnError(error)
  return readSurveyDetails(data)
}

export async function getActiveSurveyBySlug(
  slug: string,
): Promise<SurveyDetails | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_WITH_QUESTIONS)
    .eq('public_slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  raiseOnError(error)
  return readSurveyDetails(data)
}

export async function getPublicSurveyStatus(
  slug: string,
): Promise<PublicSurveyStatus> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_public_survey_status', {
    p_slug: slug,
  })
  raiseOnError(error)
  if (!isRecord(data) || data.found !== true) return { found: false }
  const surveyId = readString(data.survey_id)
  const title = readString(data.title)
  if (
    !surveyId ||
    !title ||
    !isStatus(data.status) ||
    data.status === 'draft'
  ) {
    return { found: false }
  }
  return { found: true, surveyId, status: data.status, title }
}

async function insertQuestions(
  surveyId: string,
  input: SurveyInput,
): Promise<void> {
  const supabase = getSupabaseClient()
  for (const [index, question] of input.questions.entries()) {
    const choices =
      question.type === 'true_false'
        ? [{ text: 'True' }, { text: 'False' }]
        : question.choices
    const { data, error } = await supabase
      .from('questions')
      .insert({
        survey_id: surveyId,
        question_text: question.text.trim(),
        question_type: question.type,
        position: index + 1,
      })
      .select('id')
      .single()
    raiseOnError(error)
    const questionId = isRecord(data) ? readString(data.id) : null
    if (!questionId) throw new Error('The question could not be saved.')
    const { error: choiceError } = await supabase.from('choices').insert(
      choices.map((choice, choiceIndex) => ({
        question_id: questionId,
        choice_text: choice.text.trim(),
        position: choiceIndex + 1,
      })),
    )
    raiseOnError(choiceError)
  }
}

export async function createSurvey(input: SurveyInput): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('surveys')
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      status: 'draft',
    })
    .select('id')
    .single()
  raiseOnError(error)
  const surveyId = isRecord(data) ? readString(data.id) : null
  if (!surveyId) throw new Error('The survey could not be saved.')
  try {
    await insertQuestions(surveyId, input)
  } catch (error) {
    await supabase.from('surveys').delete().eq('id', surveyId)
    throw error
  }
  return surveyId
}

export async function countResponses(surveyId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId)
  raiseOnError(error)
  return count ?? 0
}

export async function saveSurvey(
  id: string,
  input: SurveyInput,
): Promise<void> {
  const supabase = getSupabaseClient()
  const existing = await getSurvey(id)
  if (!existing) throw new Error('SURVEY_NOT_FOUND')
  if (existing.status === 'active') {
    throw new Error('Close this survey before editing it.')
  }

  const { error } = await supabase
    .from('surveys')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
    })
    .eq('id', id)
  raiseOnError(error)

  const responses = await countResponses(id)
  if (responses > 0) return

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('survey_id', id)
  raiseOnError(deleteError)
  await insertQuestions(id, input)
}

export async function deleteSurvey(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  raiseOnError(error)
}

export async function archiveSurvey(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'archived' })
    .eq('id', id)
  raiseOnError(error)
}

export async function activateSurvey(
  id: string,
): Promise<{ id: string; publicSlug: string }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('activate_survey', {
    p_survey_id: id,
  })
  raiseOnError(error)
  if (!isRecord(data)) throw new Error('The survey could not be activated.')
  const surveyId = readString(data.id)
  const publicSlug = readString(data.public_slug)
  if (!surveyId || !publicSlug)
    throw new Error('The survey could not be activated.')
  return { id: surveyId, publicSlug }
}

export async function closeSurvey(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('close_survey', { p_survey_id: id })
  raiseOnError(error)
}

export async function duplicateSurvey(id: string): Promise<string> {
  const existing = await getSurvey(id)
  if (!existing) throw new Error('SURVEY_NOT_FOUND')
  return createSurvey({
    title: copyTitle(existing.title),
    description: existing.description ?? '',
    questions: existing.questions.map((question) => ({
      text: question.questionText,
      type: question.questionType,
      choices: question.choices.map((choice) => ({ text: choice.choiceText })),
    })),
  })
}

export async function submitSurveyResponse(
  surveyId: string,
  token: string,
  answers: { questionId: string; choiceId: string }[],
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('submit_survey_response', {
    p_survey_id: surveyId,
    p_anonymous_token: token,
    p_answers: answers.map((answer) => ({
      question_id: answer.questionId,
      choice_id: answer.choiceId,
    })),
  })
  raiseOnError(error)
}

export async function getSurveyResults(
  id: string,
): Promise<SurveyResults | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(
      `
      id,
      title,
      description,
      status,
      public_slug,
      created_at,
      updated_at,
      questions (
        id,
        question_text,
        question_type,
        position,
        choices (
          id,
          choice_text,
          position
        )
      ),
      responses (
        id,
        submitted_at,
        answers (
          question_id,
          choice_id
        )
      )
    `,
    )
    .eq('id', id)
    .maybeSingle()
  raiseOnError(error)
  const details = readSurveyDetails(data)
  if (!details || !isRecord(data)) return null
  const responses = readResponses(data.responses)
  return buildSurveyResults(details, details.questions, responses)
}
