import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
  QuizRatingAuthorType,
} from '@klurigo/common'
import { BSON, Int32, ObjectId, UUID } from 'bson'

import {
  patchCollectionAvatars,
  patchMissingAvatars,
} from '../dist/patches/missing-avatars.patch.js'
import {
  cleanCollections,
  parseBsonDocuments,
  parseCollections,
  writeBsonDocuments,
  writeCollections,
} from '../dist/utils/index.js'

const saved = { ...DEFAULT_CRITTERS_AVATAR_V1, eyes: 'wink', top: null }
const historical = {
  ...DEFAULT_CRITTERS_AVATAR_V1,
  body: 'block',
  cheeks: null,
}
const copy = (value) => BSON.deserialize(BSON.serialize(value))

function assertAvatar(avatar) {
  assert.equal(isCrittersAvatarConfigurationV1(avatar), true)
  assert.notEqual(avatar.bodyColor, avatar.accentColor)
  assert.equal(Object.keys(avatar).length, 12)
}

test('one generated user/guest design is shared across games, tasks, results, and anonymous reviews', () => {
  const collections = {
    users: [{ _id: 'account' }],
    games: ['game-a', 'game-b'].map((_id) => ({
      _id,
      participants: [{ participantId: 'account' }, { participantId: 'guest' }],
      currentTask: {
        _id: 'podium',
        type: 'PODIUM',
        leaderboard: [{ playerId: 'account' }, { playerId: 'guest' }],
      },
      previousTasks: [
        {
          _id: 'question',
          type: 'QUESTION',
          answers: [{ playerId: 'account', answer: 0 }],
        },
        {
          _id: 'result',
          type: 'QUESTION_RESULT',
          results: [{ playerId: 'account' }, { playerId: 'guest' }],
        },
        {
          _id: 'leaderboard',
          type: 'LEADERBOARD',
          leaderboard: [{ playerId: 'account' }, { playerId: 'guest' }],
        },
      ],
    })),
    game_results: ['game-a', 'game-b'].map((game) => ({
      _id: `result-${game}`,
      game,
      hostParticipantId: 'account',
      players: [{ participantId: 'account' }, { participantId: 'guest' }],
    })),
    quiz_ratings: [
      {
        _id: 'review',
        author: {
          type: QuizRatingAuthorType.Anonymous,
          participantId: 'guest',
          nickname: 'Guest',
        },
      },
      {
        _id: 'account-review',
        author: { type: QuizRatingAuthorType.User, user: 'account' },
      },
    ],
  }
  const result = patchMissingAvatars(collections)
  const account = collections.users[0].avatar
  const guest = collections.games[0].participants[1].avatar
  assertAvatar(account)
  assertAvatar(guest)
  assert.notDeepEqual(account, guest)
  for (const game of collections.games) {
    assert.deepEqual(
      game.participants.map((p) => p.avatar),
      [account, guest],
    )
    assert.deepEqual(
      game.currentTask.leaderboard.map((p) => p.avatar),
      [account, guest],
    )
    assert.deepEqual(
      game.previousTasks[1].results.map((p) => p.avatar),
      [account, guest],
    )
    assert.deepEqual(
      game.previousTasks[2].leaderboard.map((p) => p.avatar),
      [account, guest],
    )
    assert.equal(
      Object.hasOwn(game.previousTasks[0].answers[0], 'avatar'),
      false,
    )
  }
  for (const game of collections.game_results) {
    assert.deepEqual(game.hostAvatar, account)
    assert.deepEqual(
      game.players.map((p) => p.avatar),
      [account, guest],
    )
  }
  assert.deepEqual(collections.quiz_ratings[0].author.avatar, guest)
  assert.equal(
    Object.hasOwn(collections.quiz_ratings[1].author, 'avatar'),
    false,
  )
  assert.equal(result.generatedIdentities, 2)
  assert.equal(result.skippedMissingIdentity, 0)
  assert.notEqual(
    collections.users[0].avatar,
    collections.games[0].participants[0].avatar,
  )
})

test('preserves all existing values and uses one account preference for all missing history', () => {
  const collections = {
    users: [{ _id: 'account', avatar: saved }],
    games: [
      {
        _id: 'game-a',
        participants: [{ participantId: 'account', avatar: historical }],
        currentTask: {
          _id: 'leaderboard',
          type: 'LEADERBOARD',
          leaderboard: [{ playerId: 'account' }],
        },
      },
      { _id: 'game-b', participants: [{ participantId: 'account' }] },
    ],
    game_results: [
      {
        _id: 'result-a',
        game: 'game-a',
        hostParticipantId: 'account',
        players: [{ participantId: 'account' }],
      },
    ],
  }
  patchMissingAvatars(collections)
  assert.equal(collections.users[0].avatar, saved)
  assert.equal(collections.games[0].participants[0].avatar, historical)
  assert.deepEqual(
    collections.games[0].currentTask.leaderboard[0].avatar,
    saved,
  )
  assert.deepEqual(collections.game_results[0].players[0].avatar, saved)
  assert.deepEqual(collections.game_results[0].hostAvatar, saved)
  assert.deepEqual(collections.games[1].participants[0].avatar, saved)

  for (const avatar of [
    null,
    false,
    [],
    {},
    { ...saved, version: 99 },
    { ...saved, version: { _bsontype: 'Long' } },
    { ...saved, body: 'unknown' },
    undefined,
  ]) {
    const user = { _id: 'existing', avatar }
    const source = {
      users: [user],
      games: [{ _id: 'g', participants: [{ participantId: 'existing' }] }],
    }
    const result = patchMissingAvatars(source)
    assert.equal(user.avatar, avatar)
    assert.equal(result.addedAvatars.users, 0)
    assertAvatar(source.games[0].participants[0].avatar)
  }
})

test('uses existing historical anchors before generating a missing account preference', () => {
  const source = {
    users: [{ _id: 'account' }],
    games: [{ _id: 'game-a', participants: [{ participantId: 'account' }] }],
    game_results: [
      {
        _id: 'result',
        game: 'game-a',
        hostParticipantId: 'account',
        hostAvatar: historical,
        players: [{ participantId: 'account' }],
      },
    ],
  }
  const result = patchMissingAvatars(source)
  assert.equal(result.generatedIdentities, 0)
  assert.deepEqual(source.users[0].avatar, historical)
  assert.deepEqual(source.games[0].participants[0].avatar, historical)
  assert.deepEqual(source.game_results[0].players[0].avatar, historical)
})

test('is repeatable, idempotent, and independent of collection/document ordering', () => {
  const first = {
    users: [{ _id: 'b' }, { _id: 'a' }],
    games: [{ _id: 'game', participants: [{ participantId: 'a' }] }],
  }
  const second = {
    games: [{ _id: 'game', participants: [{ participantId: 'a' }] }],
    users: [{ _id: 'a' }, { _id: 'b' }],
  }
  patchMissingAvatars(first)
  patchMissingAvatars(second)
  assert.deepEqual(first.users[0].avatar, second.users[1].avatar)
  assert.deepEqual(first.users[1].avatar, second.users[0].avatar)
  assert.deepEqual(first.games, second.games)
  const patched = copy(first)
  const rerun = patchMissingAvatars(first)
  assert.equal(rerun.changedDocuments.size, 0)
  assert.equal(rerun.generatedIdentities, 0)
  assert.deepEqual(first, patched)

  const anchors = (reverse) => ({
    users: [{ _id: 'account' }],
    games: [
      { _id: 'a', participants: [{ participantId: 'account', avatar: saved }] },
      {
        _id: 'b',
        participants: [{ participantId: 'account', avatar: historical }],
      },
    ][reverse ? 'reverse' : 'slice'](),
  })
  const a = anchors(false)
  const b = anchors(true)
  patchMissingAvatars(a)
  patchMissingAvatars(b)
  assert.deepEqual(a.users[0].avatar, b.users[0].avatar)
  assert.deepEqual(a.users[0].avatar, saved)
})

test('matches BSON references and keeps unrelated data and unidentified records intact', () => {
  const uuid = new UUID('12345678-1234-4234-8234-123456789abc')
  const objectId = new ObjectId('123456789abcdef012345678')
  const numericAvatar = { ...saved, version: new Int32(1) }
  const unrelated = { _id: 'quiz', owner: uuid, question: { avatar: null } }
  const source = {
    users: [{ _id: uuid, avatar: numericAvatar }, { _id: objectId }],
    games: [
      {
        _id: 'game',
        participants: [
          { participantId: uuid.toHexString().toUpperCase() },
          { participantId: objectId.toHexString() },
          { nickname: 'DoNotGuess' },
        ],
        counter: new Int32(7),
        optional: null,
      },
    ],
    quizzes: [unrelated],
  }
  const before = BSON.serialize(source)
  const result = patchMissingAvatars(source)
  assert.deepEqual(source.games[0].participants[0].avatar, saved)
  assert.deepEqual(
    source.games[0].participants[1].avatar,
    source.users[1].avatar,
  )
  assert.equal(source.users[0].avatar, numericAvatar)
  assert.equal(result.skippedMissingIdentity, 1)
  assert.equal(Object.hasOwn(source.games[0].participants[2], 'avatar'), false)
  assert.equal(source.quizzes[0], unrelated)
  const strip = copy(source)
  delete strip.users[1].avatar
  delete strip.games[0].participants[0].avatar
  delete strip.games[0].participants[1].avatar
  assert.deepEqual(BSON.serialize(strip), before)
})

test('normal cleanup preserves existing nullable and unsupported avatars without the temporary backfill', () => {
  const original = {
    users: [
      { _id: 'account', avatar: saved },
      { _id: 'future', avatar: { version: 99, custom: null } },
      { _id: 'null', avatar: null },
    ],
    games: [
      {
        _id: 'game',
        participants: [{ participantId: 'account', avatar: historical }],
        currentTask: {
          _id: 'task',
          type: 'PODIUM',
          leaderboard: [{ playerId: 'account', avatar: null }],
        },
      },
    ],
    game_results: [
      {
        _id: 'result',
        game: 'game',
        hostParticipantId: 'account',
        hostAvatar: { version: 99 },
        players: [{ participantId: 'account', avatar: saved }],
      },
    ],
    quiz_ratings: [
      {
        _id: 'rating',
        author: {
          type: QuizRatingAuthorType.Anonymous,
          participantId: 'account',
          avatar: historical,
        },
      },
    ],
  }
  const wrap = (collections) =>
    Object.fromEntries(
      Object.entries(collections).map(([name, docs]) => [
        name,
        { originalDocuments: docs, documents: docs, metadata: {} },
      ]),
    )
  const cleaned = cleanCollections(wrap(original))
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(cleaned).map(([name, collection]) => [
        name,
        collection.documents,
      ]),
    ),
    original,
  )
  const result = patchCollectionAvatars(cleaned)
  assert.equal(result.changedDocuments.size, 0)
})

test('existing CLI applies only the avatar additions on top of unchanged legacy transforms and survives reruns', () => {
  const root = mkdtempSync(join(tmpdir(), 'klurigo-avatar-migration-'))
  try {
    const input = join(root, 'input')
    const output = join(root, 'output')
    const rerun = join(root, 'rerun')
    const normalOutput = join(root, 'without-backfill')
    mkdirSync(input)
    const now = '2025-01-01T00:00:00.000Z'
    const users = [
      {
        _id: 'account',
        authProvider: 'LOCAL',
        email: 'account@example.test',
        defaultNickname: 'Account',
        avatar: saved,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: 'missing',
        authProvider: 'LOCAL',
        email: 'missing@example.test',
        defaultNickname: 'Missing',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: 'null',
        authProvider: 'LOCAL',
        email: 'null@example.test',
        defaultNickname: 'Null',
        avatar: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: 'future',
        authProvider: 'LOCAL',
        email: 'future@example.test',
        defaultNickname: 'Future',
        avatar: { version: 99, custom: null },
        createdAt: now,
        updatedAt: now,
      },
    ]
    const games = [
      {
        _id: 'game',
        name: 'Existing',
        mode: 'CLASSIC',
        status: 'completed',
        pin: '123456',
        quiz: 'quiz',
        questions: [],
        nextQuestion: 0,
        participants: [
          {
            type: 'HOST',
            participantId: 'account',
            created: now,
            updated: now,
            avatar: historical,
          },
          {
            type: 'PLAYER',
            participantId: 'missing',
            nickname: 'Player',
            rank: 1,
            worstRank: 1,
            totalScore: 10,
            created: now,
            updated: now,
          },
        ],
        currentTask: {
          _id: 'task',
          type: 'PODIUM',
          status: 'completed',
          created: now,
          leaderboard: [
            {
              playerId: 'missing',
              nickname: 'Player',
              position: 1,
              score: 10,
              streaks: 1,
            },
          ],
        },
        previousTasks: [],
        created: now,
        updated: now,
      },
    ]
    writeBsonDocuments(join(input, 'users.bson'), users)
    writeBsonDocuments(join(input, 'games.bson'), games)
    const baseline = cleanCollections(
      parseCollections(input, ['users.bson', 'games.bson']),
    )
    const cli = join(import.meta.dirname, '../dist/index.js')
    execFileSync(process.execPath, [
      cli,
      '--inputDir',
      input,
      '--outputDir',
      output,
    ])
    const migratedUsers = parseBsonDocuments(join(output, 'users.bson'))
    const migratedGames = parseBsonDocuments(join(output, 'games.bson'))
    assert.deepEqual(migratedUsers[0].avatar, saved)
    assert.deepEqual(migratedGames[0].participants[0].avatar, historical)
    assertAvatar(migratedUsers[1].avatar)
    assert.equal(migratedUsers[2].avatar, null)
    assert.deepEqual(migratedUsers[3].avatar, { version: 99, custom: null })
    assert.deepEqual(
      migratedGames[0].participants[1].avatar,
      migratedUsers[1].avatar,
    )
    assert.deepEqual(
      migratedGames[0].currentTask.leaderboard[0].avatar,
      migratedUsers[1].avatar,
    )
    const plainUsers = copy({ docs: migratedUsers }).docs
    const plainGames = copy({ docs: migratedGames }).docs
    for (const user of plainUsers) delete user.avatar
    for (const user of baseline.users.documents) delete user.avatar
    for (const participant of plainGames[0].participants)
      delete participant.avatar
    for (const participant of baseline.games.documents[0].participants)
      delete participant.avatar
    delete plainGames[0].currentTask.leaderboard[0].avatar
    assert.deepEqual(plainUsers, baseline.users.documents)
    assert.deepEqual(plainGames, baseline.games.documents)
    execFileSync(process.execPath, [
      cli,
      '--inputDir',
      output,
      '--outputDir',
      rerun,
    ])
    for (const name of [
      'users.bson',
      'games.bson',
      'users.metadata.json',
      'games.metadata.json',
    ]) {
      assert.deepEqual(
        readFileSync(join(rerun, name)),
        readFileSync(join(output, name)),
      )
    }
    // Equivalent to the original command after removing the temporary import/call.
    // No missing-avatar patch is invoked here.
    mkdirSync(normalOutput)
    const normalCollections = cleanCollections(
      parseCollections(output, ['users.bson', 'games.bson']),
    )
    writeCollections(normalOutput, normalCollections)
    for (const name of [
      'users.bson',
      'games.bson',
      'users.metadata.json',
      'games.metadata.json',
    ]) {
      assert.deepEqual(
        readFileSync(join(normalOutput, name)),
        readFileSync(join(output, name)),
      )
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
