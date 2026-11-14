import type { GameAvatarSnapshot } from './avatar'

export interface JoinGameRequestDto {
  nickname: string
  /** Optional for older callers; the server resolves a complete first-join snapshot. */
  avatar?: GameAvatarSnapshot
}
