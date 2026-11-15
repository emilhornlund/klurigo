import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_CRITTERS_AVATAR_V1,
  QuizRatingAuthorType,
} from '@klurigo/common'

import { copyAvatarMetadata } from '../dist/transformers/avatar.transformers.js'
import { transformGameResultsDocument } from '../dist/transformers/game-results.transformers.js'
import { transformGameDocument } from '../dist/transformers/game.transformers.js'
import { transformQuizRatingDocument } from '../dist/transformers/quiz-rating.transformers.js'
import { transformPlayerOrUserDocument } from '../dist/transformers/user.transformers.js'
import { cleanBSONValue } from '../dist/utils/bson.utils.js'

const avatar = {
  ...DEFAULT_CRITTERS_AVATAR_V1,
  top: null,
  pattern: null,
  cheeks: null,
}
const future = { version: 99, choices: null }
const now = '2025-01-01T00:00:00.000Z'
const score = {
  playerId: 'player',
  nickname: 'Player',
  position: 1,
  score: 10,
  streaks: 1,
}

test('permanent avatar copying and cleanup preserve existing values and never fill missing fields', () => {
  for (const value of [avatar, null, false, [], {}, future]) {
    for (const field of ['avatar', 'hostAvatar']) {
      const copied = copyAvatarMetadata({ [field]: value }, field)
      assert.equal(copied[field], value)
      assert.deepEqual(cleanBSONValue({ other: null, ...copied }), copied)
    }
  }
  assert.deepEqual(copyAvatarMetadata({}), {})
  assert.deepEqual(copyAvatarMetadata({}, 'hostAvatar'), {})
})

test('user transformer retains metadata independently of the backfill', () => {
  const source = {
    _id: 'user',
    authProvider: 'LOCAL',
    email: 'user@example.test',
    defaultNickname: 'User',
    createdAt: now,
    updatedAt: now,
  }
  for (const value of [avatar, null, future]) {
    assert.deepEqual(
      cleanBSONValue(
        transformPlayerOrUserDocument({ ...source, avatar: value }),
      ).avatar,
      value,
    )
  }
  assert.equal(
    Object.hasOwn(transformPlayerOrUserDocument(source), 'avatar'),
    false,
  )
})

test('game transformer retains participant and every stored task avatar independently of the backfill', () => {
  const source = {
    _id: 'game',
    name: 'Game',
    mode: 'CLASSIC',
    status: 'completed',
    pin: '123456',
    quiz: 'quiz',
    questions: [],
    nextQuestion: 0,
    participants: [
      {
        type: 'HOST',
        participantId: 'host',
        avatar,
        created: now,
        updated: now,
      },
      {
        type: 'PLAYER',
        participantId: 'player',
        nickname: 'Player',
        rank: 1,
        worstRank: 1,
        totalScore: 10,
        avatar: null,
        created: now,
        updated: now,
      },
    ],
    currentTask: {
      _id: 'podium',
      type: 'PODIUM',
      status: 'completed',
      created: now,
      leaderboard: [{ ...score, avatar: future }],
    },
    previousTasks: [
      {
        _id: 'leaderboard',
        type: 'LEADERBOARD',
        status: 'completed',
        created: now,
        questionIndex: 0,
        leaderboard: [{ ...score, avatar: false }],
      },
      {
        _id: 'result',
        type: 'QUESTION_RESULT',
        status: 'completed',
        created: now,
        questionIndex: 0,
        correctAnswers: [{ type: 'MULTI_CHOICE', index: 0 }],
        results: [
          {
            type: 'MULTI_CHOICE',
            playerId: 'player',
            nickname: 'Player',
            correct: true,
            lastScore: 10,
            totalScore: 10,
            position: 1,
            streak: 1,
            avatar,
          },
        ],
      },
    ],
    created: now,
    updated: now,
  }
  const result = cleanBSONValue(transformGameDocument(source))
  assert.deepEqual(result.participants[0].avatar, avatar)
  assert.equal(result.participants[1].avatar, null)
  assert.deepEqual(result.currentTask.leaderboard[0].avatar, future)
  assert.equal(result.previousTasks[0].leaderboard[0].avatar, false)
  assert.deepEqual(result.previousTasks[1].results[0].avatar, avatar)
})

test('durable result transformer retains host and player avatars independently of the backfill', () => {
  const result = cleanBSONValue(
    transformGameResultsDocument({
      _id: 'result',
      game: 'game',
      name: 'Game',
      hostParticipantId: 'host',
      hostAvatar: future,
      players: [
        {
          participantId: 'player',
          nickname: 'Player',
          rank: 1,
          comebackRankGain: 0,
          unanswered: 0,
          averageResponseTime: 1,
          score: 10,
          avatar,
        },
      ],
      questions: [],
      hosted: now,
      completed: now,
    }),
  )
  assert.deepEqual(result.hostAvatar, future)
  assert.deepEqual(result.players[0].avatar, avatar)
})

test('rating transformer retains existing author metadata without adding snapshots to account references', () => {
  const source = {
    _id: 'rating',
    quizId: 'quiz',
    stars: 5,
    created: now,
    updated: now,
  }
  for (const value of [avatar, null, future]) {
    const result = cleanBSONValue(
      transformQuizRatingDocument({
        ...source,
        author: {
          type: QuizRatingAuthorType.Anonymous,
          participantId: 'player',
          nickname: 'Player',
          avatar: value,
        },
      }),
    )
    assert.deepEqual(result.author.avatar, value)
  }
  const result = transformQuizRatingDocument({
    ...source,
    author: { type: QuizRatingAuthorType.User, user: 'user' },
  })
  assert.equal(Object.hasOwn(result.author, 'avatar'), false)
  const legacy = transformQuizRatingDocument({ ...source, author: 'user' })
  assert.deepEqual(legacy.author, {
    type: QuizRatingAuthorType.User,
    user: 'user',
  })
})
