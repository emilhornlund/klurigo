import type {
  ClassicQuestionDto,
  QuestionCommonDto,
  QuestionDto,
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
  ZeroToOneHundredQuestionDto,
} from '@klurigo/common'
import {
  GameMode,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
  QUIZ_STANDARD_POINTS,
} from '@klurigo/common'

import {
  isClassicMultiChoiceQuestion,
  isClassicPinQuestion,
  isClassicPuzzleQuestion,
  isClassicRangeQuestion,
  isClassicTrueFalseQuestion,
  isClassicTypeAnswerQuestion,
} from './question-type.guard'

/**
 * Default points value for newly created questions.
 *
 * Used as the initial value when building partial question DTOs in the quiz editor.
 */
const defaultPoints = QUIZ_STANDARD_POINTS

/**
 * Default duration in seconds for newly created questions.
 *
 * Used as the initial value when building partial question DTOs in the quiz editor.
 */
const defaultDuration = 30

/**
 * Common question properties shared across all Classic-mode question types.
 *
 * Note: `media` is intentionally excluded here because Classic Pin questions omit `media`.
 */
type ClassicCommonBase = Pick<
  QuestionCommonDto,
  'question' | 'points' | 'duration' | 'info'
>

/**
 * Media property extracted from `QuestionCommonDto`.
 *
 * This is only applicable to Classic-mode question types that support `media`
 * (all Classic questions except `QuestionPinDto`).
 */
type ClassicCommonWithMedia = Pick<QuestionCommonDto, 'media'>

/**
 * Target shape for copy helpers that can receive Classic common base fields.
 */
type TargetWithClassicBase = Partial<ClassicCommonBase>

/**
 * Target shape for copy helpers that can receive Classic common base fields
 * plus optional media.
 */
type TargetWithClassicBaseAndMedia = TargetWithClassicBase &
  Partial<ClassicCommonWithMedia>

/**
 * Copies Classic-mode common base fields (`question`, `points`, `duration`, `info`)
 * from a source DTO into a target partial DTO.
 *
 * @param target - DTO to mutate with copied common base fields.
 * @param source - Source values to copy from.
 */
function copyClassicCommonBase<TTarget extends TargetWithClassicBase>(
  target: TTarget,
  source: Partial<ClassicCommonBase>,
): void {
  target.question = source.question
  target.points = source.points
  target.duration = source.duration
  target.info = source.info
}

/**
 * Type guard that narrows a Classic-mode question to variants that support `media`.
 *
 * Classic Pin questions (`QuestionType.Pin`) omit `media`, so they must be excluded
 * before accessing `source.media`.
 *
 * @param source - Candidate Classic-mode question DTO.
 * @returns `true` when the question supports `media`, otherwise `false`.
 */
function isClassicQuestionWithMedia(
  source: Partial<ClassicQuestionDto>,
): source is Partial<Exclude<ClassicQuestionDto, QuestionPinDto>> &
  ClassicCommonWithMedia {
  return source.type !== QuestionType.Pin
}

/**
 * Copies the `media` property from a Classic-mode source question into a target,
 * but only if the source question type supports `media` (i.e., not `Pin`).
 *
 * @param target - DTO to mutate with the copied media.
 * @param source - Source Classic question DTO to copy media from.
 */
function copyClassicCommonMedia<TTarget extends TargetWithClassicBaseAndMedia>(
  target: TTarget,
  source: Partial<ClassicQuestionDto>,
): void {
  if (isClassicQuestionWithMedia(source)) {
    target.media = source.media
  }
}

/**
 * Determines whether a given question DTO is any Classic-mode question type.
 *
 * Used to decide whether shared fields can be copied when converting between
 * Classic question types.
 *
 * @param dto - Candidate question DTO.
 * @returns `true` if the DTO is a Classic-mode question, otherwise `false`.
 */
function isAnyClassicQuestion(
  dto: Partial<QuestionDto>,
): dto is Partial<ClassicQuestionDto> {
  return (
    isClassicMultiChoiceQuestion(GameMode.Classic, dto) ||
    isClassicTrueFalseQuestion(GameMode.Classic, dto) ||
    isClassicRangeQuestion(GameMode.Classic, dto) ||
    isClassicTypeAnswerQuestion(GameMode.Classic, dto) ||
    isClassicPinQuestion(GameMode.Classic, dto) ||
    isClassicPuzzleQuestion(GameMode.Classic, dto)
  )
}

/**
 * Builds a partial Classic MultiChoice question DTO.
 *
 * If `fromDto` is a Classic MultiChoice question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic fields are copied
 * into the newly created MultiChoice DTO (including `media`, except for Pin).
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial MultiChoice question DTO suitable for editor initialization.
 */
export function buildPartialClassicMultiChoiceQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionMultiChoiceDto> {
  const dto: Partial<QuestionMultiChoiceDto> = {
    type: QuestionType.MultiChoice,
    question: undefined,
    media: undefined,
    options: [],
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicMultiChoiceQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
    copyClassicCommonMedia(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial Classic TrueFalse question DTO.
 *
 * If `fromDto` is a Classic TrueFalse question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic fields are copied
 * into the newly created TrueFalse DTO (including `media`, except for Pin).
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial TrueFalse question DTO suitable for editor initialization.
 */
export function buildPartialClassicTrueFalseQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionTrueFalseDto> {
  const dto: Partial<QuestionTrueFalseDto> = {
    type: QuestionType.TrueFalse,
    question: undefined,
    media: undefined,
    correct: undefined,
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicTrueFalseQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
    copyClassicCommonMedia(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial Classic Range question DTO.
 *
 * If `fromDto` is a Classic Range question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic fields are copied
 * into the newly created Range DTO (including `media`, except for Pin).
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial Range question DTO suitable for editor initialization.
 */
export function buildPartialClassicRangeQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionRangeDto> {
  const dto: Partial<QuestionRangeDto> = {
    type: QuestionType.Range,
    question: undefined,
    media: undefined,
    min: 0,
    max: 100,
    margin: QuestionRangeAnswerMargin.Medium,
    correct: 50,
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicRangeQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
    copyClassicCommonMedia(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial Classic TypeAnswer question DTO.
 *
 * If `fromDto` is a Classic TypeAnswer question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic fields are copied
 * into the newly created TypeAnswer DTO (including `media`, except for Pin).
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial TypeAnswer question DTO suitable for editor initialization.
 */
export function buildPartialClassicTypeAnswerQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionTypeAnswerDto> {
  const dto: Partial<QuestionTypeAnswerDto> = {
    type: QuestionType.TypeAnswer,
    question: undefined,
    media: undefined,
    options: [],
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicTypeAnswerQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
    copyClassicCommonMedia(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial Classic Pin question DTO.
 *
 * If `fromDto` is a Classic Pin question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic base fields are copied
 * into the newly created Pin DTO.
 *
 * Note: Pin questions intentionally omit `media` (they use `imageURL` instead),
 * so media is never copied.
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial Pin question DTO suitable for editor initialization.
 */
export function buildPartialClassicPinQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionPinDto> {
  const dto: Partial<QuestionPinDto> = {
    type: QuestionType.Pin,
    question: undefined,
    imageURL: undefined,
    positionX: 0.5,
    positionY: 0.5,
    tolerance: QuestionPinTolerance.Medium,
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicPinQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial Classic Puzzle question DTO.
 *
 * If `fromDto` is a Classic Puzzle question, it is returned as-is.
 * If `fromDto` is another Classic question type, shared Classic fields are copied
 * into the newly created Puzzle DTO (including `media`, except for Pin).
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial Puzzle question DTO suitable for editor initialization.
 */
export function buildPartialClassicPuzzleQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionPuzzleDto> {
  const dto: Partial<QuestionPuzzleDto> = {
    type: QuestionType.Puzzle,
    question: undefined,
    media: undefined,
    values: [],
    points: defaultPoints,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (isClassicPuzzleQuestion(GameMode.Classic, fromDto)) {
    return fromDto
  }

  if (isAnyClassicQuestion(fromDto)) {
    copyClassicCommonBase(dto, fromDto)
    copyClassicCommonMedia(dto, fromDto)
  }

  return dto
}

/**
 * Builds a partial ZeroToOneHundred Range question DTO.
 *
 * If `fromDto` is a Range question, shared common fields are copied into the newly
 * created ZeroToOneHundred Range DTO.
 *
 * Note: ZeroToOneHundred Range is a different DTO shape than Classic Range, so Classic
 * guards are not used here. The DTO still shares `QuestionCommonDto` fields such as
 * `question`, `duration`, `info`, and `media`.
 *
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial ZeroToOneHundred Range question DTO suitable for editor initialization.
 */
export function buildPartialZeroToOneHundredRangeQuestionDto(
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionZeroToOneHundredRangeDto> {
  const dto: Partial<QuestionZeroToOneHundredRangeDto> = {
    type: QuestionType.Range,
    question: undefined,
    media: undefined,
    correct: 50,
    duration: defaultDuration,
    info: undefined,
  }

  if (!fromDto) return dto

  if (fromDto.type === QuestionType.Range) {
    dto.question = fromDto.question
    dto.duration = fromDto.duration
    dto.info = fromDto.info
    dto.media = (fromDto as Partial<QuestionCommonDto>).media
  }

  return dto
}

/**
 * Builds a partial Classic-mode question DTO for the requested Classic question type.
 *
 * If `fromDto` is provided, the builder attempts to copy compatible shared fields
 * from it into the newly created DTO.
 *
 * @param type - The Classic question type to build.
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial Classic question DTO suitable for editor initialization.
 */
export function buildPartialClassicQuestionDto(
  type: QuestionType,
  fromDto?: Partial<QuestionDto>,
): Partial<ClassicQuestionDto> {
  switch (type) {
    case QuestionType.MultiChoice:
      return buildPartialClassicMultiChoiceQuestionDto(fromDto)
    case QuestionType.TrueFalse:
      return buildPartialClassicTrueFalseQuestionDto(fromDto)
    case QuestionType.Range:
      return buildPartialClassicRangeQuestionDto(fromDto)
    case QuestionType.TypeAnswer:
      return buildPartialClassicTypeAnswerQuestionDto(fromDto)
    case QuestionType.Pin:
      return buildPartialClassicPinQuestionDto(fromDto)
    case QuestionType.Puzzle:
      return buildPartialClassicPuzzleQuestionDto(fromDto)
  }
}

/**
 * Builds a partial ZeroToOneHundred-mode question DTO for the requested question type.
 *
 * Currently, ZeroToOneHundred mode only supports Range questions.
 *
 * @param type - The ZeroToOneHundred question type to build.
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial ZeroToOneHundred question DTO suitable for editor initialization.
 * @throws Error when `type` is not supported in ZeroToOneHundred mode.
 */
export function buildPartialZeroToOneHundredQuestionDto(
  type: QuestionType,
  fromDto?: Partial<QuestionDto>,
): Partial<ZeroToOneHundredQuestionDto> {
  if (type === QuestionType.Range) {
    return buildPartialZeroToOneHundredRangeQuestionDto(fromDto)
  }
  throw new Error(`Unsupported question type ${type}`)
}

/**
 * Builds a partial question DTO for the requested game mode and question type.
 *
 * Delegates to mode-specific builders and optionally copies shared fields from `fromDto`
 * when provided.
 *
 * @param mode - The game mode that determines the supported question types.
 * @param type - The question type to build.
 * @param fromDto - Optional source question DTO to copy shared fields from.
 * @returns A partial question DTO suitable for editor initialization.
 */
export function buildPartialQuestionDto(
  mode: GameMode,
  type: QuestionType,
  fromDto?: Partial<QuestionDto>,
): Partial<QuestionDto> {
  switch (mode) {
    case GameMode.Classic:
      return buildPartialClassicQuestionDto(type, fromDto)
    case GameMode.ZeroToOneHundred:
      return buildPartialZeroToOneHundredQuestionDto(type, fromDto)
  }
}
