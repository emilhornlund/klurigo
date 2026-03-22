import {
  GameMode,
  GameParticipantType,
  GameStatus,
  QuestionType,
} from '@klurigo/common'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Model, Schema as MongooseSchema } from 'mongoose'

import {
  BaseQuestionDaoSchema,
  QuestionDao,
  QuestionMultiChoiceDaoSchema,
  QuestionPinDaoSchema,
  QuestionPuzzleDaoSchema,
  QuestionRangeDaoSchema,
  QuestionTrueFalseDaoSchema,
  QuestionTypeAnswerDaoSchema,
  Quiz,
} from '../../../../quiz-core/repositories/models/schemas'

import { GameSettings, GameSettingsSchema } from './game-settings.schema'
import {
  Participant,
  ParticipantHostSchema,
  ParticipantPlayerSchema,
  ParticipantSchema,
} from './participant.schema'
import {
  BaseTask,
  BaseTaskSchema,
  LeaderboardTask,
  LeaderboardTaskSchema,
  LobbyTask,
  LobbyTaskSchema,
  PodiumTask,
  PodiumTaskSchema,
  QuestionResultTask,
  QuestionResultTaskSchema,
  QuestionTask,
  QuestionTaskSchema,
  TaskType,
} from './task.schema'

export type GameDocument = HydratedDocument<Game>

@Schema({ _id: true, collection: 'games' })
export class Game {
  @Prop({ type: String, required: true })
  _id: string

  @Prop({ type: String, required: true })
  name: string

  @Prop({ type: String, enum: GameMode, required: true })
  mode: GameMode

  @Prop({ type: String, enum: GameStatus, required: true })
  status: GameStatus

  @Prop({ type: String, required: true })
  pin: string

  /**
   * The quiz document associated with the game.
   */
  @Prop({ type: String, ref: 'Quiz' })
  quiz: Quiz

  /**
   * Runtime settings for this game instance.
   */
  @Prop({ type: GameSettingsSchema, required: true })
  settings: GameSettings

  /**
   * The associated questions of the game.
   */
  @Prop({ type: [BaseQuestionDaoSchema], required: true })
  questions: QuestionDao[]

  @Prop({ type: Number, required: true })
  nextQuestion: number

  @Prop({ type: [ParticipantSchema], required: true })
  participants: Participant[]

  @Prop({ type: BaseTaskSchema, required: true })
  currentTask: BaseTask &
    (
      | LobbyTask
      | QuestionTask
      | QuestionResultTask
      | LeaderboardTask
      | PodiumTask
    )

  @Prop({ type: [BaseTaskSchema], required: true })
  previousTasks: (BaseTask &
    (
      | LobbyTask
      | QuestionTask
      | QuestionResultTask
      | LeaderboardTask
      | PodiumTask
    ))[]

  @Prop({ type: Date, required: true })
  updated: Date

  @Prop({ type: Date, required: true })
  created: Date

  @Prop({ type: Date, required: false })
  completedAt?: Date
}

/**
 * Mongoose model type for the Game schema.
 */
export type GameModel = Model<Game>

export const GameSchema = SchemaFactory.createForClass(Game)

// Supports the recent-activity aggregation in findRecentGameStats, which
// matches on { status: Completed, completedAt: { $gte: cutoff } }.
// Leading equality on `status` lets MongoDB narrow the scan, followed by
// a range seek on `completedAt`.
GameSchema.index({ status: 1, completedAt: 1 })

const participantsSchema =
  GameSchema.path<MongooseSchema.Types.Array>('participants')
participantsSchema.discriminator(
  GameParticipantType.HOST,
  ParticipantHostSchema,
)
participantsSchema.discriminator(
  GameParticipantType.PLAYER,
  ParticipantPlayerSchema,
)

const questionsSchema = GameSchema.path<MongooseSchema.Types.Array>('questions')
questionsSchema.discriminator(
  QuestionType.MultiChoice,
  QuestionMultiChoiceDaoSchema,
)
questionsSchema.discriminator(QuestionType.Range, QuestionRangeDaoSchema)
questionsSchema.discriminator(
  QuestionType.TrueFalse,
  QuestionTrueFalseDaoSchema,
)
questionsSchema.discriminator(
  QuestionType.TypeAnswer,
  QuestionTypeAnswerDaoSchema,
)
questionsSchema.discriminator(QuestionType.Pin, QuestionPinDaoSchema)
questionsSchema.discriminator(QuestionType.Puzzle, QuestionPuzzleDaoSchema)

const currentTaskSchema =
  GameSchema.path<MongooseSchema.Types.Subdocument>('currentTask')
currentTaskSchema.discriminator(TaskType.Lobby, LobbyTaskSchema)
currentTaskSchema.discriminator(TaskType.Question, QuestionTaskSchema)
currentTaskSchema.discriminator(
  TaskType.QuestionResult,
  QuestionResultTaskSchema,
)
currentTaskSchema.discriminator(TaskType.Leaderboard, LeaderboardTaskSchema)
currentTaskSchema.discriminator(TaskType.Podium, PodiumTaskSchema)

const previousTasksSchema =
  GameSchema.path<MongooseSchema.Types.Array>('previousTasks')
previousTasksSchema.discriminator(TaskType.Lobby, LobbyTaskSchema)
previousTasksSchema.discriminator(TaskType.Question, QuestionTaskSchema)
previousTasksSchema.discriminator(
  TaskType.QuestionResult,
  QuestionResultTaskSchema,
)
previousTasksSchema.discriminator(TaskType.Leaderboard, LeaderboardTaskSchema)
previousTasksSchema.discriminator(TaskType.Podium, PodiumTaskSchema)
