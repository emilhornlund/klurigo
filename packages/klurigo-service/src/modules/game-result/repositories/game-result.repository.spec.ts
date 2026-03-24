import { GameResultRepository } from './game-result.repository'

describe('GameResultRepository', () => {
  let repository: GameResultRepository
  let countMock: jest.MockedFunction<
    (filter: Record<string, unknown>) => Promise<number>
  >

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(
      GameResultRepository.prototype,
    ) as GameResultRepository

    countMock = jest.fn()
    ;(repository as unknown as { count: typeof countMock }).count = countMock
  })

  describe('countHostedGamesByUserId', () => {
    it('counts game results hosted by the given user', async () => {
      countMock.mockResolvedValueOnce(4)

      await expect(repository.countHostedGamesByUserId('user-1')).resolves.toBe(
        4,
      )

      expect(countMock).toHaveBeenCalledTimes(1)
      expect(countMock).toHaveBeenCalledWith({
        hostParticipantId: 'user-1',
      })
    })
  })

  describe('countPlayedGamesByUserId', () => {
    it('counts game results where the given user appears in players', async () => {
      countMock.mockResolvedValueOnce(9)

      await expect(repository.countPlayedGamesByUserId('user-1')).resolves.toBe(
        9,
      )

      expect(countMock).toHaveBeenCalledTimes(1)
      expect(countMock).toHaveBeenCalledWith({
        'players.participantId': 'user-1',
      })
    })
  })
})
