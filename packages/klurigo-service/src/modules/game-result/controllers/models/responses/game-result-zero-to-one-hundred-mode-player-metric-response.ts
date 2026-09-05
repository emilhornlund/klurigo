import { GameResultZeroToOneHundredModePlayerMetricDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, ValidateNested } from 'class-validator'

import {
  ApiGameResultPlayerMetricAverageResponseTimeProperty,
  ApiGameResultPlayerMetricComebackRankGainProperty,
  ApiGameResultPlayerMetricRankProperty,
  ApiGameResultPlayerMetricScoreProperty,
  ApiGameResultPlayerMetricUnansweredProperty,
} from '../../decorators/api'

import { GameResultParticipantResponse } from './game-result-participant.response'

/**
 * Represents a player's final performance metrics in the game for a zero to one hundred mode game.
 */
export class GameResultZeroToOneHundredModePlayerMetricResponse implements GameResultZeroToOneHundredModePlayerMetricDto {
  /**
   * The player who participated in the game.
   */
  @ApiProperty({
    title: 'Player',
    description: 'The player who participated in the game.',
    required: true,
    type: GameResultParticipantResponse,
  })
  @Type(() => GameResultParticipantResponse)
  @ValidateNested({ each: true })
  player: GameResultParticipantResponse

  /**
   * The player's final rank in the game (1 = first place, etc.).
   */
  @ApiGameResultPlayerMetricRankProperty()
  rank: number

  /**
   * The net number of positions the player recovered by the end of the game.
   */
  @ApiGameResultPlayerMetricComebackRankGainProperty()
  comebackRankGain: number

  /**
   * The player's average precision for range-based answers (0 = worst, 1 = best).
   */
  @ApiProperty({
    title: 'Average Precision',
    description:
      "The player's average precision for range-based answers (0 = worst, 1 = best).",
    required: true,
    type: Number,
  })
  @IsNumber()
  averagePrecision: number

  /**
   * The total number of questions the player left unanswered.
   */
  @ApiGameResultPlayerMetricUnansweredProperty()
  unanswered: number

  /**
   * The average time (in milliseconds) the player took to answer questions.
   */
  @ApiGameResultPlayerMetricAverageResponseTimeProperty()
  averageResponseTime: number

  /**
   * The player's total score at the end of the game.
   */
  @ApiGameResultPlayerMetricScoreProperty()
  score: number
}
