import { GameStatus } from '@klurigo/common'

import { TaskType } from '../repositories/models/schemas'

import {
  isCurrentTask,
  isSupportedTaskStatusTransition,
  isSupportedTaskTypeProgression,
} from './game-lifecycle.utils'

describe('game lifecycle guards', () => {
  const statusCases: Array<
    [
      'pending' | 'active' | 'completed',
      'active' | 'completed' | undefined,
      boolean,
    ]
  > = [
    ['pending', 'active', true],
    ['active', 'completed', true],
    ['completed', undefined, true],
    ['pending', 'completed', false],
    ['active', 'active', false],
    ['completed', 'active', false],
  ]

  it.each(statusCases)(
    'validates task status transition %s -> %s',
    (
      from: 'pending' | 'active' | 'completed',
      to: 'active' | 'completed' | undefined,
      expected: boolean,
    ) => {
      expect(isSupportedTaskStatusTransition(TaskType.Question, from, to)).toBe(
        expected,
      )
    },
  )

  const typeCases: Array<[TaskType, TaskType, boolean]> = [
    [TaskType.Lobby, TaskType.Question, true],
    [TaskType.Question, TaskType.QuestionResult, true],
    [TaskType.QuestionResult, TaskType.Leaderboard, true],
    [TaskType.QuestionResult, TaskType.Podium, true],
    [TaskType.Leaderboard, TaskType.Question, true],
    [TaskType.Podium, TaskType.Question, false],
    [TaskType.Question, TaskType.Leaderboard, false],
  ]

  it.each(typeCases)(
    'validates task type progression %s -> %s',
    (from: TaskType, to: TaskType, expected: boolean) => {
      expect(
        isSupportedTaskTypeProgression(
          from,
          to,
          from === TaskType.QuestionResult && to === TaskType.Leaderboard,
        ),
      ).toBe(expected)
    },
  )

  it('requires game status and all task identity fields to match', () => {
    const game = {
      status: GameStatus.Active,
      currentTask: {
        _id: 'task-1',
        type: TaskType.Question,
        status: 'active',
      },
    } as never

    expect(
      isCurrentTask(game, {
        id: 'task-1',
        type: TaskType.Question,
        status: 'active',
      }),
    ).toBe(true)
    expect(
      isCurrentTask(game, {
        id: 'task-2',
        type: TaskType.Question,
        status: 'active',
      }),
    ).toBe(false)
    expect(
      isCurrentTask(
        { ...(game as object), status: GameStatus.Completed } as never,
        {
          id: 'task-1',
          type: TaskType.Question,
          status: 'active',
        },
      ),
    ).toBe(false)
  })
})
