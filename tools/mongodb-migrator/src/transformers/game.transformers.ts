import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDate,
  toDateOrThrow,
} from '../utils'

import { buildQuizQuestions } from './quiz.transformers'

/**
 * Transforms a document from the `games` collection into a `games` document format.
 *
 * @param document - A single document from the original `games` collection.
 * @returns The transformed `games`-format document.
 */
export function transformGameDocument(document: BSONDocument): BSONDocument {
  const questions: BSONDocument[] = buildQuizQuestions(document)

  const currentTask = buildGameTask(
    extractValueOrThrow<BSONDocument>(document, {}, 'currentTask'),
  )
  const previousTasks = extractValueOrThrow<BSONDocument[]>(
    document,
    {},
    'previousTasks',
  ).map((task) => buildGameTask(task))

  return {
    _id: extractValueOrThrow<string>(document, {}, '_id'),
    __v: 0,
    name: extractValueOrThrow<string>(document, {}, 'name'),
    mode: extractValueOrThrow<string>(document, {}, 'mode'),
    status: extractValueOrThrow<string>(document, {}, 'status'),
    pin: extractValueOrThrow<string>(document, {}, 'pin'),
    settings: {
      shouldAutoCompleteQuestionResultTask: extractValueOrThrow<boolean>(
        document,
        {},
        'settings.shouldAutoCompleteQuestionResultTask',
      ),
      shouldAutoCompleteLeaderboardTask: extractValueOrThrow<boolean>(
        document,
        {},
        'settings.shouldAutoCompleteLeaderboardTask',
      ),
      shouldAutoCompletePodiumTask: extractValueOrThrow<boolean>(
        document,
        {},
        'settings.shouldAutoCompletePodiumTask',
      ),
      randomizeQuestionOrder: extractValueOrThrow<boolean>(
        document,
        {},
        'settings.randomizeQuestionOrder',
      ),
      randomizeAnswerOrder: extractValueOrThrow<boolean>(
        document,
        {},
        'settings.randomizeAnswerOrder',
      ),
    },
    quiz: extractValueOrThrow<string>(document, {}, 'quiz'),
    questions,
    nextQuestion: extractValueOrThrow<number>(document, {}, 'nextQuestion'),
    participants: buildGameParticipants(document),
    currentTask,
    previousTasks,
    updated: toDateOrThrow(
      extractValueOrThrow<string>(document, {}, 'updated'),
    ),
    created: toDateOrThrow(
      extractValueOrThrow<string>(document, {}, 'created'),
    ),
    completedAt: toDateOrThrow(
      extractValueOrThrow<string>(document, {}, 'completedAt'),
    ),
  }
}

/**
 * Constructs the game’s participants array, combining host and players,
 * filling in rank/name/ID as needed from tasks or client-mapper.
 *
 * @param document - The original game document.
 * @returns Typed array of participant entries (HOST + PLAYER).
 * @throws {Error} If no participants are found.
 */
function buildGameParticipants(document: BSONDocument): Array<BSONDocument> {
  return extractValueOrThrow<Array<BSONDocument>>(
    document,
    {},
    'participants',
  ).map((participant) => {
    const type = extractValueOrThrow<string>(participant, {}, 'type')

    const participantId = extractValueOrThrow<string>(
      participant,
      {},
      'participantId',
    )

    let additional: BSONDocument = {}
    if (type === 'HOST') {
      additional = {
        participantId,
      }
    }
    if (type === 'PLAYER') {
      additional = {
        participantId,
        nickname: extractValueOrThrow<string>(participant, {}, 'nickname'),
        rank: extractValueOrThrow<number>(participant, {}, 'rank'),
        worstRank: extractValueOrThrow<number>(participant, {}, 'worstRank'),
        totalScore: extractValueOrThrow<number>(participant, {}, 'totalScore'),
        currentStreak: extractValueOrThrow<number>(
          participant,
          {},
          'currentStreak',
        ),
        totalResponseTime: extractValueOrThrow<number>(
          participant,
          {},
          'totalResponseTime',
        ),
        responseCount: extractValueOrThrow<number>(
          participant,
          {},
          'responseCount',
        ),
      }
    }
    return {
      type,
      ...additional,
      created: toDateOrThrow(
        extractValueOrThrow<string>(participant, {}, 'created'),
      ),
      updated: toDateOrThrow(
        extractValueOrThrow<string>(participant, {}, 'updated'),
      ),
    }
  })
}

/**
 * Converts each raw task document into a normalized task, handling
 * LOBBY, QUESTION, QUESTION_RESULT, LEADERBOARD, PODIUM.
 *
 * Legacy QUIT tasks are no longer produced; callers should replace a
 * QUIT currentTask with the last entry in previousTasks before invoking
 * this function.
 *
 * @param task - Original task sub-document.
 * @returns A fully-typed task object for the output schema.
 */
function buildGameTask(task: BSONDocument): BSONDocument {
  const type = extractValueOrThrow<string>(task, {}, 'type')
  let additional: BSONDocument = {}
  if (type === 'LOBBY') {
    additional = {}
  } else if (type === 'QUESTION') {
    additional = {
      questionIndex: extractValueOrThrow<number>(task, {}, 'questionIndex'),
      metadata: ((metadata) => {
        if (metadata === null) {
          return null
        }

        const metadataType = extractValueOrThrow<string>(metadata, {}, 'type')

        let additionalMetadata: BSONDocument = {}

        if (metadataType === 'PUZZLE') {
          additionalMetadata = {
            ...additionalMetadata,
            randomizedValues: extractValueOrThrow<string[]>(
              metadata,
              {},
              'randomizedValues',
            ),
          }
        }

        return {
          type: metadataType,
          ...additionalMetadata,
        }
      })(extractValue(task, {}, 'metadata')),
      answers: extractValueOrThrow<Array<BSONDocument>>(
        task,
        {},
        'answers',
      ).map((answer) => ({
        type: extractValueOrThrow<string>(answer, {}, 'type'),
        playerId: extractValueOrThrow<string>(answer, {}, 'playerId'),
        created: toDateOrThrow(
          extractValueOrThrow<string>(answer, {}, 'created'),
        ),
        answer: ((type) => {
          if (type === 'MULTI_CHOICE') {
            return extractValue<number>(answer, {}, 'answer')
          } else if (type === 'RANGE') {
            return extractValue<number>(answer, {}, 'answer')
          } else if (type === 'TRUE_FALSE') {
            return extractValue<boolean>(answer, {}, 'answer')
          } else if (type === 'TYPE_ANSWER') {
            return extractValue<string>(answer, {}, 'answer')
          } else if (type === 'PIN') {
            return extractValue<string>(answer, {}, 'answer')
          } else if (type === 'PUZZLE') {
            return extractValue<string[]>(answer, {}, 'answer')
          }
          return null
        })(extractValueOrThrow<string>(answer, {}, 'type')),
      })),
      presented: toDateOrThrow(
        extractValueOrThrow<string>(task, {}, 'presented'),
      ),
    }
  } else if (type === 'QUESTION_RESULT') {
    additional = {
      questionIndex: extractValueOrThrow<number>(task, {}, 'questionIndex'),
      correctAnswers: buildGameCorrectAnswers(task),
      results: buildGameQuestionResults(task),
    }
  } else if (type === 'LEADERBOARD') {
    additional = {
      questionIndex: extractValueOrThrow<number>(task, {}, 'questionIndex'),
      leaderboard: buildGameLeaderboard(task, true),
    }
  } else if (type === 'PODIUM') {
    additional = {
      leaderboard: buildGameLeaderboard(task),
    }
  }
  return {
    _id: extractValueOrThrow<string>(task, {}, '_id'),
    type,
    status: extractValueOrThrow<string>(task, {}, 'status'),
    currentTransitionInitiated: toDateOrThrow(
      extractValueOrThrow<string>(task, {}, 'currentTransitionInitiated'),
    ),
    currentTransitionExpires: toDate(
      extractValue<string>(task, {}, 'currentTransitionExpires'),
    ),
    created: toDateOrThrow(extractValueOrThrow<string>(task, {}, 'created')),
    ...additional,
  }
}

/**
 * Maps raw `correctAnswers` or derives them from the quiz question options
 * when missing.
 *
 * @param task - QUESTION_RESULT or similar task containing correctAnswers.
 * @returns Array of correct-answer records (index/value by type).
 * @throws {Error} If no correct answers can be determined.
 */
function buildGameCorrectAnswers(task: BSONDocument): Array<BSONDocument> {
  return extractValueOrThrow<Array<BSONDocument>>(
    task,
    {},
    'correctAnswers',
  ).map((correctAnswer) => {
    const type = extractValueOrThrow<string>(correctAnswer, {}, 'type')

    let additional: BSONDocument = {}

    if (type === 'MULTI_CHOICE') {
      additional = {
        index: extractValueOrThrow<number>(correctAnswer, {}, 'index'),
      }
    } else if (type === 'RANGE') {
      additional = {
        value: extractValueOrThrow<number>(correctAnswer, {}, 'value'),
      }
    } else if (type === 'TRUE_FALSE') {
      additional = {
        value: extractValueOrThrow<boolean>(correctAnswer, {}, 'value'),
      }
    } else if (type === 'TYPE_ANSWER') {
      additional = {
        value: extractValueOrThrow<string>(correctAnswer, {}, 'value'),
      }
    } else if (type === 'PIN') {
      additional = {
        value: extractValueOrThrow<string>(correctAnswer, {}, 'value'),
      }
    } else if (type === 'PUZZLE') {
      additional = {
        value: extractValueOrThrow<string[]>(correctAnswer, {}, 'value'),
      }
    }

    return {
      type,
      ...additional,
    }
  })
}

/**
 * Normalizes each player’s per-question result into the unified output format.
 *
 * @param task - QUESTION_RESULT task containing results entries.
 * @returns Array of result entries with answer, correct, score, streak, etc.
 */
function buildGameQuestionResults(task: BSONDocument): Array<BSONDocument> {
  return extractValueOrThrow<Array<BSONDocument>>(task, {}, 'results').map(
    (item) => {
      const answer: BSONDocument | null = ((answer: BSONDocument | null) => {
        if (!answer) {
          return null
        }

        const type = extractValueOrThrow<string>(answer, {}, 'type')
        let additional: BSONDocument = {}
        if (type === 'MULTI_CHOICE') {
          additional = {
            answer: extractValueOrThrow<number>(answer, {}, 'answer'),
          }
        }
        if (type === 'RANGE') {
          additional = {
            answer: extractValueOrThrow<number>(answer, {}, 'answer'),
          }
        }
        if (type === 'TRUE_FALSE') {
          additional = {
            answer: extractValueOrThrow<boolean>(answer, {}, 'answer'),
          }
        }
        if (type === 'TYPE_ANSWER') {
          additional = {
            answer: extractValueOrThrow<string>(answer, {}, 'answer'),
          }
        }
        if (type === 'PIN') {
          additional = {
            answer: extractValueOrThrow<string>(answer, {}, 'answer'),
          }
        }
        if (type === 'PUZZLE') {
          additional = {
            answer: extractValueOrThrow<string[]>(answer, {}, 'answer'),
          }
        }
        return {
          type,
          playerId: extractValueOrThrow<string>(answer, {}, 'playerId'),
          created: toDate(extractValueOrThrow<string>(answer, {}, 'created')),
          ...additional,
        }
      })(extractValue<BSONDocument>(item, {}, 'answer'))

      const playerId = extractValueOrThrow<string>(item, {}, 'playerId')

      return {
        type: extractValueOrThrow<string>(item, {}, 'type'),
        playerId,
        nickname: extractValueOrThrow<string>(item, {}, 'nickname'),
        answer,
        correct: extractValueOrThrow<boolean>(item, {}, 'correct'),
        lastScore: extractValueOrThrow<number>(item, {}, 'lastScore'),
        totalScore: extractValueOrThrow<number>(item, {}, 'totalScore'),
        position: extractValueOrThrow<number>(item, {}, 'position'),
        streak: extractValueOrThrow<number>(item, {}, 'streak'),
        lastResponseTime: extractValueOrThrow<number>(
          item,
          {},
          'lastResponseTime',
        ),
        totalResponseTime: extractValueOrThrow<number>(
          item,
          {},
          'totalResponseTime',
        ),
        responseCount: extractValueOrThrow<number>(item, {}, 'responseCount'),
      }
    },
  )
}

/**
 * Reads the raw leaderboard array from a task and applies ID overrides.
 *
 * @param task - LEADERBOARD or PODIUM task.
 * @param includePreviousPosition - Whether to include `previousPosition` on each leaderboard item when present on the source task items.
 * @returns Array of leaderboard items with normalized player IDs.
 */
function buildGameLeaderboard(
  task: BSONDocument,
  includePreviousPosition: boolean = false,
): Array<BSONDocument> {
  return extractValueOrThrow<Array<BSONDocument>>(task, {}, 'leaderboard').map(
    (item) => buildGameLeaderboardTaskItem(item, includePreviousPosition),
  )
}

/**
 * Formats a single leaderboard entry, applying `overridePlayerId`.
 *
 * @param leaderboardTaskItem - Raw item from the leaderboard array.
 * @param includePreviousPosition - Whether to include `previousPosition` on the returned item (if available on the source document).
 * @returns Typed item with `playerId`, `position`, `nickname`, `score`, `streaks`.
 */
function buildGameLeaderboardTaskItem(
  leaderboardTaskItem: BSONDocument,
  includePreviousPosition: boolean = false,
): BSONDocument {
  return {
    playerId: extractValueOrThrow<string>(leaderboardTaskItem, {}, 'playerId'),
    position: extractValueOrThrow<number>(leaderboardTaskItem, {}, 'position'),
    ...(includePreviousPosition
      ? {
          previousPosition: extractValue<number>(
            leaderboardTaskItem,
            {},
            'previousPosition',
          ),
        }
      : {}),
    nickname: extractValueOrThrow<string>(leaderboardTaskItem, {}, 'nickname'),
    score: Math.round(
      extractValueOrThrow<number>(leaderboardTaskItem, {}, 'score'),
    ),
    streaks: extractValueOrThrow<number>(leaderboardTaskItem, {}, 'streaks'),
  }
}
