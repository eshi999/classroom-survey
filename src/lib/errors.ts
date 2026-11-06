function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') return message
  }
  return ''
}

export function instructorMessage(error: unknown): string {
  const message = readMessage(error)
  const lower = message.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials')
  ) {
    return 'Email or password is incorrect.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirm your email before signing in.'
  }
  if (lower.includes('jwt') || lower.includes('session')) {
    return 'Your session expired. Sign in again.'
  }
  if (message.includes('AUTHENTICATION_REQUIRED')) {
    return 'Sign in as the instructor to do that.'
  }
  if (message.includes('SURVEY_NOT_FOUND')) {
    return 'That survey could not be found.'
  }
  if (message.includes('SURVEY_NOT_ACTIVE')) {
    return 'Only an active survey can be closed.'
  }
  if (message.includes('SURVEY_HAS_NO_QUESTIONS')) {
    return 'Add at least one question before activating this survey.'
  }
  return 'Something went wrong. Please try again.'
}

export function studentMessage(error: unknown): string {
  const message = readMessage(error)
  if (message.includes('DUPLICATE_RESPONSE')) {
    return 'You have already submitted a response to this survey.'
  }
  if (message.includes('SURVEY_NOT_ACTIVE')) {
    return 'This survey is no longer accepting responses.'
  }
  if (message.includes('MISSING_REQUIRED_ANSWER')) {
    return 'Answer every question before submitting.'
  }
  if (
    message.includes('INVALID_CHOICE') ||
    message.includes('INVALID_QUESTION')
  ) {
    return 'One of the answers could not be saved. Refresh the page and try again.'
  }
  const lower = message.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}
