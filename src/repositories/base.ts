/**
 * Shared repository helpers. Firebase-specific code lives under ./firebase/.
 */

export interface RepositoryResult<T> {
  data: T | null
  error: string | null
}

export class RepositoryError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
  }
}

export function notImplemented(repository: string, method: string): never {
  throw new RepositoryError(
    'repository/not-implemented',
    `${repository}.${method} is not implemented yet.`,
  )
}
