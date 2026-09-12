export const getErrorStack = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error)

export const structuredLog = (
  message: string,
  context: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({ message, ...context }).filter(
      ([, value]) => value !== undefined,
    ),
  )
