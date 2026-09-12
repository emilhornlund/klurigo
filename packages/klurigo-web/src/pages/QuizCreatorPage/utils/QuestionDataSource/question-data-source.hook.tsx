import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import { useCallback, useMemo, useState } from 'react'

import { buildPartialQuestionDto } from '../../../../utils/questions'
import { validateDiscriminatedDto } from '../../../../validation'
import {
  classicQuestionRules,
  zeroToOneHundredQuestionRules,
} from '../../validation-rules'

import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from './question-data-source.types'

/**
 * Creates a deep copy of a value.
 *
 * Prefers `structuredClone` when available for correctness and broader type support.
 * Falls back to JSON serialization for plain data objects.
 *
 * @typeParam T - The type of the value being cloned.
 * @param value - The value to clone.
 * @returns A deep copy of the provided value.
 */
const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Checks whether an index is valid for an array-like collection with the given length.
 *
 * @param index - The index to validate.
 * @param length - The length of the collection.
 * @returns `true` if the index is within bounds, otherwise `false`.
 */
const isValidIndex = (index: number, length: number): boolean =>
  index >= 0 && index < length

/**
 * Provides a stateful question DTO source for the quiz editor.
 *
 * Manages:
 * - The active `GameMode` (Classic or ZeroToOneHundred).
 * - A list of partial `QuestionDto` objects for editing.
 * - The currently selected question index and derived selected question.
 * - Mode-specific discriminated validation for each question and an aggregate validity flag.
 *
 * Exposes a set of actions to select, add, update, duplicate, delete, and replace questions.
 *
 * @returns An object containing the current state (mode, questions, selection, validations)
 * and actions to update that state.
 */
export const useQuestionDataSource = () => {
  /**
   * The currently selected game mode for the question editor.
   *
   * When undefined, the editor has not been initialized via `setGameMode`.
   */
  const [mode, setMode] = useState<GameMode>()

  /**
   * The list of questions being edited as partial DTOs.
   *
   * Questions are stored as partials to allow incremental form editing before the DTO is complete.
   */
  const [questions, setQuestions] = useState<Array<QuizQuestionModel>>([])

  /**
   * The index of the currently selected question.
   *
   * A value of `-1` indicates that no question is selected.
   */
  const [selectedQuestionIndex, setSelectedIndex] = useState<number>(-1)

  /**
   * Validation results for each question, using the discriminated rules for the active mode.
   *
   * Returns an empty array when the mode is not yet selected.
   */
  const questionValidations = useMemo<QuizQuestionValidationResult[]>(() => {
    if (!mode) {
      return []
    }
    return questions.map((q) => {
      if (mode === GameMode.Classic) {
        return Object.freeze(validateDiscriminatedDto(q, classicQuestionRules))
      }
      return Object.freeze(
        validateDiscriminatedDto(q, zeroToOneHundredQuestionRules),
      )
    })
  }, [mode, questions])

  /**
   * Indicates whether all questions are currently valid.
   *
   * Returns `false` when there are no questions or when any question fails validation.
   */
  const allQuestionsValid = useMemo(
    () =>
      questionValidations.length > 0 &&
      questionValidations.every((v) => v.valid),
    [questionValidations],
  )

  /**
   * The currently selected question DTO, if a valid mode and selection exist.
   *
   * Returns `undefined` when:
   * - No mode is selected, or
   * - No question is selected, or
   * - The selected index is out of bounds.
   */
  const selectedQuestion = useMemo<QuizQuestionModel | undefined>(() => {
    if (!mode) {
      return undefined
    }
    if (!isValidIndex(selectedQuestionIndex, questions.length)) {
      return undefined
    }
    return questions[selectedQuestionIndex]
  }, [mode, selectedQuestionIndex, questions])

  /**
   * Selects a question by index.
   *
   * @param index - The index of the question to select.
   * @throws Error when the game mode is not set.
   * @throws Error when the index is out of bounds.
   */
  const selectQuestion = useCallback(
    (index: number): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }
      if (!isValidIndex(index, questions.length)) {
        throw new Error('Invalid question index')
      }
      setSelectedIndex(index)
    },
    [mode, questions.length],
  )

  /**
   * Updates a single property on the currently selected question.
   *
   * @typeParam K - A key of the `QuestionDto` union type.
   * @param key - The property key to update.
   * @param value - The new value for the given key. Pass `undefined` to clear the field.
   * @throws Error when the game mode is not set.
   * @throws Error when no valid question is currently selected.
   */
  const updateSelectedQuestionField: QuizQuestionModelFieldChangeFunction<QuestionDto> =
    useCallback(
      (key, value) => {
        if (!mode) {
          throw new Error('Invalid game mode')
        }

        setQuestions((prevQuestions) => {
          const index = selectedQuestionIndex
          if (!isValidIndex(index, prevQuestions.length)) {
            throw new Error('Invalid question index')
          }

          const updated = [...prevQuestions]
          updated[index] = { ...updated[index], [key]: value } as QuestionDto
          return updated
        })
      },
      [mode, selectedQuestionIndex],
    )

  /**
   * Appends a new question of the given type and selects it.
   *
   * The new question is created as a partial DTO appropriate for the current mode.
   *
   * @param type - The question type to add.
   * @throws Error when the game mode is not set.
   */
  const addQuestion = useCallback(
    (type: QuestionType): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }

      setQuestions((prevQuestions) => {
        const nextIndex = prevQuestions.length
        setSelectedIndex(nextIndex)
        return [...prevQuestions, buildPartialQuestionDto(mode, type)]
      })
    },
    [mode],
  )

  /**
   * Moves the currently selected question to a new index.
   *
   * Removes the selected question from its current position and inserts it at
   * the target index. The relative order of all other questions is preserved.
   *
   * After the move, the selected question index becomes the target index.
   *
   * Intended for drag-and-drop reordering.
   *
   * @param index - The target index to move the selected question to.
   * @throws Error when the game mode is not set.
   * @throws Error when the selected index is invalid.
   * @throws Error when the target index is invalid.
   */
  const moveSelectedQuestionTo = useCallback(
    (index: number): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }

      setQuestions((prevQuestions) => {
        const fromIndex = selectedQuestionIndex

        if (!isValidIndex(fromIndex, prevQuestions.length)) {
          throw new Error('Invalid question index')
        }
        if (!isValidIndex(index, prevQuestions.length)) {
          throw new Error('Invalid question index')
        }

        if (fromIndex === index) {
          return prevQuestions
        }

        const updated = [...prevQuestions]
        const [moved] = updated.splice(fromIndex, 1)

        updated.splice(index, 0, moved)

        setSelectedIndex(index)
        return updated
      })
    },
    [mode, selectedQuestionIndex],
  )

  /**
   * Duplicates a question at the given index and inserts the copy directly after it.
   *
   * @param index - The index of the question to duplicate.
   * @throws Error when the game mode is not set.
   * @throws Error when the index is out of bounds.
   */
  const duplicateQuestion = useCallback(
    (index: number): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }

      setQuestions((prevQuestions) => {
        if (!isValidIndex(index, prevQuestions.length)) {
          throw new Error('Invalid question index')
        }

        const duplicated = deepClone(prevQuestions[index])
        const updated = [...prevQuestions]
        updated.splice(index + 1, 0, duplicated)

        return updated
      })
    },
    [mode],
  )

  /**
   * Deletes a question at the given index and adjusts the selection accordingly.
   *
   * Selection rules:
   * - If the list becomes empty, selection becomes `-1`.
   * - If the deleted index was selected, select the nearest remaining item.
   * - If the deleted index was before the selected index, shift selection left by one.
   *
   * @param index - The index of the question to delete.
   * @throws Error when the game mode is not set.
   * @throws Error when the index is out of bounds.
   */
  const deleteQuestion = useCallback(
    (index: number): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }

      setQuestions((prevQuestions) => {
        if (!isValidIndex(index, prevQuestions.length)) {
          throw new Error('Invalid question index')
        }

        const updated = [...prevQuestions]
        updated.splice(index, 1)

        setSelectedIndex((prevSelected) => {
          if (updated.length === 0) {
            return -1
          }

          if (prevSelected === index) {
            return Math.min(index, updated.length - 1)
          }

          if (prevSelected > index) {
            return prevSelected - 1
          }

          return prevSelected
        })

        return updated
      })
    },
    [mode],
  )

  /**
   * Replaces the currently selected question with a new partial question of the given type.
   *
   * The replacement is created using the current mode and may reuse compatible values
   * from the current question as provided by `buildPartialQuestionDto`.
   *
   * @param type - The new question type to replace the selected question with.
   * @throws Error when the game mode is not set.
   * @throws Error when no valid question is currently selected.
   */
  const replaceQuestion = useCallback(
    (type: QuestionType): void => {
      if (!mode) {
        throw new Error('Invalid game mode')
      }

      setQuestions((prevQuestions) => {
        if (!isValidIndex(selectedQuestionIndex, prevQuestions.length)) {
          throw new Error('Invalid question index')
        }

        const current = prevQuestions[selectedQuestionIndex]
        const updated = [...prevQuestions]
        updated[selectedQuestionIndex] = buildPartialQuestionDto(
          mode,
          type,
          current,
        )
        return updated
      })
    },
    [mode, selectedQuestionIndex],
  )

  /**
   * Sets the active game mode and initializes the editor with a single default question.
   *
   * Defaults:
   * - Classic mode starts with a `MultiChoice` question.
   * - ZeroToOneHundred mode starts with a `Range` question.
   *
   * Resets selection to index `0`.
   *
   * @param gameMode - The mode to activate for the editor.
   */
  const setGameMode = useCallback((gameMode: GameMode): void => {
    const initialType =
      gameMode === GameMode.Classic
        ? QuestionType.MultiChoice
        : QuestionType.Range

    setMode(gameMode)
    setQuestions([buildPartialQuestionDto(gameMode, initialType)])
    setSelectedIndex(0)
  }, [])

  /**
   * Sets the active game mode without changing the questions.
   *
   * This is used when server data hydrates an existing editor. User-initiated
   * mode changes should use `setGameMode`, which intentionally starts a new
   * question collection.
   *
   * @param gameMode - The mode to activate for the editor.
   */
  const setGameModeWithoutReset = useCallback((gameMode: GameMode): void => {
    setMode(gameMode)
  }, [])

  /**
   * Replaces the question collection and selects its first question.
   *
   * Selection is updated together with the replacement because a separate
   * `selectQuestion` call would still see the previous collection during the
   * same event.
   *
   * @param nextQuestions - The question collection to make editable.
   */
  const setQuestionsAndSelect = useCallback(
    (nextQuestions: QuizQuestionModel[]): void => {
      setQuestions(nextQuestions)
      setSelectedIndex(nextQuestions.length > 0 ? 0 : -1)
    },
    [],
  )

  return {
    gameMode: mode,
    setGameMode,
    setGameModeWithoutReset,

    questions,
    setQuestions,
    setQuestionsAndSelect,

    questionValidations,
    allQuestionsValid,

    selectedQuestion,
    selectedQuestionIndex,
    selectQuestion,

    addQuestion,
    updateSelectedQuestionField,
    moveSelectedQuestionTo,
    duplicateQuestion,
    deleteQuestion,
    replaceQuestion,
  }
}
