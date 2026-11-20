import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { ValidationPipe } from '@nestjs/common'

import { GameHistoryPageFilter } from './game-history-page-filter.decorator'

describe('GameHistoryPageFilter', () => {
  const pipe = new ValidationPipe({ transform: true })
  const transform = (value: Record<string, unknown>) =>
    pipe.transform(value, { type: 'query', metatype: GameHistoryPageFilter })

  it('accepts omitted options and transforms pagination', async () => {
    await expect(transform({})).resolves.toBeInstanceOf(GameHistoryPageFilter)
    await expect(
      transform({ limit: '5', offset: '10' }),
    ).resolves.toMatchObject({ limit: 5, offset: 10 })
  })

  it('accepts combined supported options and literal search syntax', async () => {
    const query = {
      search: '[Trivia]+',
      participantType: GameParticipantType.HOST,
      mode: GameMode.ZeroToOneHundred,
      status: GameStatus.Completed,
      sort: 'name',
      order: 'asc',
    }
    await expect(transform(query)).resolves.toMatchObject(query)
  })

  it.each([
    { search: ['a', 'b'] },
    { search: { name: 'a' } },
    { participantType: 'OWNER' },
    { mode: 'OTHER' },
    { status: GameStatus.Expired },
    { status: GameStatus.Terminated },
    { status: 'OTHER' },
    { sort: 'status' },
    { order: 'ascending' },
    { sort: ['name', 'created'] },
    { limit: '4' },
    { limit: '51' },
    { limit: '5.5' },
    { offset: '-1' },
    { offset: 'text' },
  ])('rejects invalid query %j', async (query) => {
    await expect(transform(query)).rejects.toMatchObject({ status: 400 })
  })
})
