import { randomUUID } from 'node:crypto'

import { GameEventType } from '@klurigo/common'
import { expect } from '@playwright/test'

import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { test } from '../support/fixtures/game-session-fixtures'

test('updates connected player lobby events as players join', async ({
  page,
  gameSessionFixture,
  gameHost,
  createGamePlayer,
}) => {
  const fixture = gameSessionFixture
  const quiz = fixture.quizzes.classic
  const firstNickname = `LobbyOne${randomUUID().slice(0, 8)}`
  const secondNickname = `LobbyTwo${randomUUID().slice(0, 8)}`

  await authenticatePageThroughApi(page, fixture.email)
  await page.goto(`/quiz/details/${quiz.id}`)
  const gamePIN = await startHostGame(page)

  await gameHost.authenticate(
    { email: fixture.email, password: E2E_USER_PASSWORD },
    { gamePIN },
  )
  await gameHost.connect()
  await gameHost.waitForEvent(
    GameEventType.GameLobbyHost,
    (event) => event.game.pin === gamePIN && event.players.length === 0,
  )

  const firstPlayer = createGamePlayer()
  await firstPlayer.authenticateAndJoin({ gamePIN }, firstNickname)
  await firstPlayer.connect()
  const firstLobby = await firstPlayer.waitForEvent(
    GameEventType.GameLobbyPlayer,
    (event) => event.players.length === 1,
  )
  expect(firstLobby.game.name).toBe(quiz.title)
  expect(firstLobby.player).toEqual({ nickname: firstNickname })
  expect(firstLobby.players).toEqual([{ nickname: firstNickname }])

  const secondPlayerLobby = firstPlayer.waitForEvent(
    GameEventType.GameLobbyPlayer,
    (event) => event.players.length === 2,
  )
  const secondPlayer = createGamePlayer()
  await secondPlayer.authenticateAndJoin({ gamePIN }, secondNickname)
  await secondPlayer.connect()

  const updatedFirstPlayerLobby = await secondPlayerLobby
  expect(updatedFirstPlayerLobby.players).toHaveLength(2)
  expect(
    updatedFirstPlayerLobby.players.map(({ nickname }) => nickname),
  ).toEqual(expect.arrayContaining([firstNickname, secondNickname]))

  const secondPlayerLobbyEvent = await secondPlayer.waitForEvent(
    GameEventType.GameLobbyPlayer,
    (event) => event.players.length === 2,
  )
  expect(secondPlayerLobbyEvent.game.name).toBe(quiz.title)
})
