/**
 * Runtime map of the reusable question fields rendered by QuestionField.
 *
 * Answer editor selection uses QuestionType instead.
 */
export const QuestionFieldType = {
  CommonDuration: 'DURATION',
  CommonInfo: 'INFO',
  CommonMedia: 'MEDIA',
  CommonPoints: 'POINTS',
  CommonQuestion: 'QUESTION',
  CommonType: 'TYPE',

  RangeCorrect: 'CORRECT',
  RangeMargin: 'MARGIN',
  RangeMax: 'MAX',
  RangeMin: 'MIN',
} as const

/**
 * Identifies a reusable field rendered by QuestionField, including the
 * individual numeric controls used by range answer editors.
 */
export type QuestionFieldType =
  (typeof QuestionFieldType)[keyof typeof QuestionFieldType]
