import type { CrittersAvatarConfigurationV1 } from './avatar'

export interface JoinGameRequestDto {
  nickname: string

  /** Complete design submitted with the nickname for the first accepted join. */
  avatar: CrittersAvatarConfigurationV1
}
