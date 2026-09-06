import type { AuthResponseDto, CreateGameResponseDto } from '@klurigo/common'

export type CreateGameThroughPublicApiOptions = {
  apiBaseUrl: string
  email: string
  password: string
  quizId: string
}

export async function createGameThroughPublicApi({
  apiBaseUrl,
  email,
  password,
  quizId,
}: CreateGameThroughPublicApiOptions): Promise<CreateGameResponseDto> {
  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Host login failed with HTTP ${loginResponse.status}`)
  }

  const { accessToken } = (await loginResponse.json()) as AuthResponseDto
  const gameResponse = await fetch(
    `${apiBaseUrl}/quizzes/${encodeURIComponent(quizId)}/games`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  )

  if (!gameResponse.ok) {
    throw new Error(`Game creation failed with HTTP ${gameResponse.status}`)
  }

  return (await gameResponse.json()) as CreateGameResponseDto
}
