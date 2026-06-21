/**
 * Shape of the API error body returned by the server:
 *   { data: null, error: { message: string, status: number } }
 */
export interface ApiError {
  message: string
  status: number
}

/**
 * The server injects the typed error under this key on the ApolloError
 * so every catch site can read it directly.
 */
const API_ERROR_KEY = "__apiError"

/**
 * Attach an ApiError onto any Error so catch sites can retrieve it.
 * Used internally by the Apollo link — not needed in application code.
 */
export function attachApiError(err: Error, apiError: ApiError): void {
  ;(err as any)[API_ERROR_KEY] = apiError
}

/**
 * Extract the typed ApiError from anything thrown by Apollo mutations /
 * queries.  Falls back to a generic 500 error so callers always get a
 * usable object.
 *
 * @example
 * ```ts
 * try {
 *   await createRoadmap(...)
 * } catch (e) {
 *   toast.error(getApiError(e).message)
 * }
 * ```
 */
export function getApiError(err: unknown): ApiError {
  if (err && typeof err === "object") {
    // Attached by our Apollo link from the custom error body
    if (API_ERROR_KEY in err) {
      return (err as any)[API_ERROR_KEY] as ApiError
    }

    // ApolloError: check graphql errors array (each error may carry extensions)
    const graphQLErrors = (err as any).graphQLErrors
    if (Array.isArray(graphQLErrors) && graphQLErrors.length > 0) {
      const first = graphQLErrors[0]
      const status =
        typeof first?.extensions?.status === "number"
          ? first.extensions.status
          : 500
      const message =
        typeof first?.message === "string" ? first.message : "An error occurred"
      return { message, status }
    }

    // ApolloError: check networkError (could be a ServerError with a result body)
    const networkError = (err as any).networkError
    if (networkError) {
      const result = (networkError as any).result
      if (result?.error?.message) {
        return {
          message: result.error.message,
          status: result.error.status ?? (networkError as any).statusCode ?? 500,
        }
      }
      const message =
        typeof networkError.message === "string"
          ? networkError.message
          : "Network error"
      return { message, status: (networkError as any).statusCode ?? 500 }
    }

    // Plain Error
    if (typeof (err as any).message === "string") {
      return { message: (err as any).message, status: 500 }
    }
  }

  return { message: "An unexpected error occurred", status: 500 }
}

/**
 * Returns true when the error represents a specific HTTP status code.
 *
 * @example
 * ```ts
 * if (isApiErrorStatus(e, 422)) toast.error(getApiError(e).message)
 * ```
 */
export function isApiErrorStatus(err: unknown, status: number): boolean {
  return getApiError(err).status === status
}
