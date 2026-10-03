export const addRevealedQuestionId = (
  current: Set<string>,
  questionId: string,
): Set<string> => {
  if (current.has(questionId)) return current
  return new Set(current).add(questionId)
}
