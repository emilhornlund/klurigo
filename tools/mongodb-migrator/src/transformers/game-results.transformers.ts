import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDate,
} from '../utils'

/**
 * Transforms a document from the `game_results` collection into a `game_results` document format.
 *
 * @param document - A single document from the original `game_results` collection.
 * @returns The transformed `game_results`-format document.
 */
export function transformGameResultsDocument(
  document: BSONDocument,
): BSONDocument {
  return {
    _id: extractValueOrThrow<string>(document, {}, '_id'),
    __v: 0,
    name: extractValueOrThrow<string>(document, {}, 'name'),
    game: extractValueOrThrow<string>(document, {}, 'game'),
    hostParticipantId: extractValueOrThrow<string>(
      document,
      {},
      'hostParticipantId',
    ),
    players: extractValueOrThrow<BSONDocument[]>(document, {}, 'players').map(
      (player) => ({
        participantId: extractValueOrThrow<string>(player, {}, 'participantId'),
        nickname: extractValueOrThrow<string>(player, {}, 'nickname'),
        rank: extractValueOrThrow<number>(player, {}, 'rank'),
        comebackRankGain: extractValueOrThrow<number>(
          player,
          {},
          'comebackRankGain',
        ),
        correct: extractValue<number>(player, {}, 'correct'),
        incorrect: extractValue<number>(player, {}, 'incorrect'),
        averagePrecision: extractValue<number>(player, {}, 'averagePrecision'),
        unanswered: extractValueOrThrow<number>(player, {}, 'unanswered'),
        averageResponseTime: extractValueOrThrow<number>(
          player,
          {},
          'averageResponseTime',
        ),
        longestCorrectStreak: extractValueOrThrow<number>(
          player,
          {},
          'longestCorrectStreak',
        ),
        score: Math.round(extractValueOrThrow<number>(player, {}, 'score')),
      }),
    ),
    questions: extractValueOrThrow<BSONDocument[]>(
      document,
      {},
      'questions',
    ).map((question) => ({
      text: extractValueOrThrow<string>(question, {}, 'text'),
      type: extractValueOrThrow<string>(question, {}, 'type'),
      correct: extractValue<number>(question, {}, 'correct'),
      incorrect: extractValue<number>(question, {}, 'incorrect'),
      averagePrecision: extractValue<number>(question, {}, 'averagePrecision'),
      unanswered: extractValueOrThrow<number>(question, {}, 'unanswered'),
      averageResponseTime: extractValueOrThrow<number>(
        question,
        {},
        'averageResponseTime',
      ),
    })),
    hosted: toDate(extractValueOrThrow<string>(document, {}, 'hosted')),
    completed: toDate(extractValueOrThrow<string>(document, {}, 'completed')),
  }
}
