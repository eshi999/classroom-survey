import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { InstructorFrame } from '../components/InstructorFrame.tsx'
import { LoadingState } from '../components/LoadingState.tsx'
import { instructorMessage } from '../lib/errors.ts'
import {
  activateSurvey,
  closeSurvey,
  countResponses,
  createSurvey,
  getSurvey,
  saveSurvey,
} from '../lib/surveyApi.ts'
import type { QuestionType, SurveyInput } from '../lib/types.ts'
import {
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from '../lib/ui.ts'
import { trueFalseChoices, validateSurvey } from '../lib/validation.ts'

type EditorChoice = { key: string; text: string }
type EditorQuestion = {
  key: string
  text: string
  type: QuestionType
  choices: EditorChoice[]
}

function newKey(): string {
  return crypto.randomUUID()
}

function blankQuestion(): EditorQuestion {
  return {
    key: newKey(),
    text: '',
    type: 'multiple_choice',
    choices: [
      { key: newKey(), text: '' },
      { key: newKey(), text: '' },
    ],
  }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  if (!item) return items
  next.splice(target, 0, item)
  return next
}

function toInput(
  title: string,
  description: string,
  questions: EditorQuestion[],
): SurveyInput {
  return {
    title,
    description,
    questions: questions.map((question) => ({
      text: question.text,
      type: question.type,
      choices:
        question.type === 'true_false'
          ? trueFalseChoices()
          : question.choices.map((choice) => ({ text: choice.text })),
    })),
  }
}

export function SurveyEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<EditorQuestion[]>([
    blankQuestion(),
  ])
  const [status, setStatus] = useState<
    'draft' | 'active' | 'closed' | 'archived' | null
  >(null)
  const [responseCount, setResponseCount] = useState(0)
  const [loading, setLoading] = useState(Boolean(id))
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    void Promise.all([getSurvey(id), countResponses(id)])
      .then(([survey, responses]) => {
        if (!active) return
        if (!survey) {
          setMessage('That survey could not be found.')
          return
        }
        setTitle(survey.title)
        setDescription(survey.description ?? '')
        setStatus(survey.status)
        setResponseCount(responses)
        setQuestions(
          survey.questions.length > 0
            ? survey.questions.map((question) => ({
                key: question.id,
                text: question.questionText,
                type: question.questionType,
                choices: question.choices.map((choice) => ({
                  key: choice.id,
                  text: choice.choiceText,
                })),
              }))
            : [blankQuestion()],
        )
      })
      .catch((error: unknown) => {
        if (active) setMessage(instructorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const structureLocked = responseCount > 0

  function updateQuestion(
    key: string,
    updater: (question: EditorQuestion) => EditorQuestion,
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key ? updater(question) : question,
      ),
    )
  }

  async function persist(thenActivate: boolean) {
    const input = toInput(title, description, questions)
    const nextErrors = validateSurvey(input)
    setErrors(nextErrors)
    setMessage(null)
    if (nextErrors.length > 0) return
    setPending(true)
    let surveyId = id
    try {
      if (!surveyId) surveyId = await createSurvey(input)
      else await saveSurvey(surveyId, input)
      if (thenActivate) {
        const activated = await activateSurvey(surveyId)
        navigate(`/surveys/${activated.id}/present`)
        return
      }
      if (!id && surveyId) {
        navigate(`/surveys/${surveyId}/edit`, { replace: true })
      }
      setMessage(
        structureLocked
          ? 'Saved the title and description. Questions were kept so past responses stay intact.'
          : 'Saved',
      )
      setStatus((current) => current ?? 'draft')
    } catch (error) {
      if (!id && surveyId) {
        navigate(`/surveys/${surveyId}/edit`, { replace: true })
      }
      setMessage(instructorMessage(error))
    } finally {
      setPending(false)
    }
  }

  async function handleCloseAndEdit() {
    if (!id) return
    setPending(true)
    setMessage(null)
    try {
      await closeSurvey(id)
      setStatus('closed')
    } catch (error) {
      setMessage(instructorMessage(error))
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <InstructorFrame>
        <LoadingState label="Loading survey..." />
      </InstructorFrame>
    )
  }

  if (status === 'active' && id) {
    return (
      <InstructorFrame>
        <h1 className="text-3xl font-semibold">This survey is active</h1>
        <p className="mt-3 max-w-xl text-slate-700">
          Close it before editing. Closing stops new student responses and keeps
          the answers already collected.
        </p>
        {message ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={pending}
            onClick={() => void handleCloseAndEdit()}
          >
            {pending ? 'Closing...' : 'Close survey and edit'}
          </button>
          <Link to={`/surveys/${id}/present`} className={secondaryButtonClass}>
            Back to presentation
          </Link>
        </div>
      </InstructorFrame>
    )
  }

  return (
    <InstructorFrame>
      <h1 className="text-3xl font-semibold">
        {id ? 'Edit survey' : 'New survey'}
      </h1>
      {structureLocked ? (
        <p className="mt-3 max-w-2xl rounded-md border border-amber-700 bg-amber-50 px-4 py-3 text-amber-950">
          This survey already has {responseCount} responses. You can update the
          title and description. Duplicate the survey if you need different
          questions. Past answers stay attached to the original questions.
        </p>
      ) : null}
      {errors.length > 0 ? (
        <ul
          className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-700"
          role="alert"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-slate-700" role="status">
          {message}
        </p>
      ) : null}

      <label className="mt-6 block text-sm font-medium" htmlFor="survey-title">
        Survey Title
      </label>
      <input
        id="survey-title"
        className={`${textInputClass} mt-2`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="survey-description"
      >
        Description
      </label>
      <textarea
        id="survey-description"
        className={`${textInputClass} mt-2 min-h-24`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="mt-8 space-y-4">
        {questions.map((question, questionIndex) => (
          <fieldset
            key={question.key}
            className="rounded-lg border border-slate-200 p-4"
            disabled={structureLocked}
          >
            <legend className="px-1 text-sm font-semibold">
              Question {questionIndex + 1}
            </legend>
            <label
              className="mt-2 block text-sm font-medium"
              htmlFor={`question-${question.key}`}
            >
              Question text
            </label>
            <input
              id={`question-${question.key}`}
              className={`${textInputClass} mt-2`}
              value={question.text}
              onChange={(event) =>
                updateQuestion(question.key, (current) => ({
                  ...current,
                  text: event.target.value,
                }))
              }
            />
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor={`type-${question.key}`}
            >
              Type
            </label>
            <select
              id={`type-${question.key}`}
              className={`${textInputClass} mt-2`}
              value={question.type}
              onChange={(event) => {
                const type =
                  event.target.value === 'true_false'
                    ? 'true_false'
                    : 'multiple_choice'
                updateQuestion(question.key, (current) => ({
                  ...current,
                  type,
                  choices:
                    type === 'true_false'
                      ? [
                          { key: newKey(), text: 'True' },
                          { key: newKey(), text: 'False' },
                        ]
                      : current.choices,
                }))
              }}
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
            </select>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Choices</p>
              {question.choices.map((choice, choiceIndex) => (
                <div key={choice.key} className="flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor={`choice-${choice.key}`}>
                    Choice {choiceIndex + 1}
                  </label>
                  <input
                    id={`choice-${choice.key}`}
                    className={textInputClass}
                    value={choice.text}
                    disabled={question.type === 'true_false'}
                    onChange={(event) =>
                      updateQuestion(question.key, (current) => ({
                        ...current,
                        choices: current.choices.map((item) =>
                          item.key === choice.key
                            ? { ...item, text: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  {question.type === 'multiple_choice' ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() =>
                        updateQuestion(question.key, (current) => ({
                          ...current,
                          choices: moveItem(current.choices, choiceIndex, -1),
                        }))
                      }
                    >
                      Up
                    </button>
                  ) : null}
                  {question.type === 'multiple_choice' ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() =>
                        updateQuestion(question.key, (current) => ({
                          ...current,
                          choices: moveItem(current.choices, choiceIndex, 1),
                        }))
                      }
                    >
                      Down
                    </button>
                  ) : null}
                  {question.type === 'multiple_choice' ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => {
                        if (!window.confirm('Delete this choice?')) return
                        updateQuestion(question.key, (current) => ({
                          ...current,
                          choices: current.choices.filter(
                            (item) => item.key !== choice.key,
                          ),
                        }))
                      }}
                    >
                      Delete choice
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {question.type === 'multiple_choice' ? (
              <button
                type="button"
                className={`${secondaryButtonClass} mt-3`}
                onClick={() =>
                  updateQuestion(question.key, (current) => ({
                    ...current,
                    choices: [...current.choices, { key: newKey(), text: '' }],
                  }))
                }
              >
                + Add Choice
              </button>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  setQuestions((current) =>
                    moveItem(current, questionIndex, -1),
                  )
                }
              >
                Move question up
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  setQuestions((current) => moveItem(current, questionIndex, 1))
                }
              >
                Move question down
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  if (!window.confirm('Delete this question?')) return
                  setQuestions((current) =>
                    current.filter((item) => item.key !== question.key),
                  )
                }}
              >
                Delete Question
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={structureLocked}
          onClick={() =>
            setQuestions((current) => [...current, blankQuestion()])
          }
        >
          + Add Question
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={pending}
          onClick={() => void persist(false)}
        >
          {pending ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={pending}
          onClick={() => void persist(true)}
        >
          Activate
        </button>
        <Link to="/dashboard" className={secondaryButtonClass}>
          Back to Dashboard
        </Link>
      </div>
    </InstructorFrame>
  )
}
