export const GAME_SESSION_FIXTURE_SLOT_COUNT = 3

export type GameSessionFixtureCapacity = {
  workerCount: number
  repeatCount: number
}

export function validateGameSessionFixtureCapacity({
  workerCount,
  repeatCount,
}: GameSessionFixtureCapacity): void {
  const requiredFixtureSlots = workerCount * repeatCount

  if (requiredFixtureSlots > GAME_SESSION_FIXTURE_SLOT_COUNT) {
    throw new Error(
      `GameSession fixture capacity is insufficient: configured GameSession worker count: ${workerCount}; configured repeat count: ${repeatCount}; required fixture-slot count: ${requiredFixtureSlots}; available fixture-slot count: ${GAME_SESSION_FIXTURE_SLOT_COUNT}.`,
    )
  }
}
