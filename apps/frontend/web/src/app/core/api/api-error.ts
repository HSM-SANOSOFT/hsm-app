import type { Issue } from './response';

/**
 * Normalized client-side error surfaced by {@link ApiClient}.
 *
 * Every failed API response is an `UnsuccessResponseDto` (see `./response`)
 * whose `issue` field carries the machine-readable `code`, the human-readable
 * `message` (string or string[]), and the offending `field` (string or
 * string[]). Network/transport failures (no `UnsuccessResponseDto` body) are
 * also funnelled through here so callers only ever catch a single error type.
 */
export class ApiError extends Error {
  /** HTTP status code (0 for transport/network failures). */
  readonly status: number;

  /** Machine-readable error identifier, e.g. `AUTH_INVALID_CREDENTIALS`. */
  readonly code?: string;

  /** Field(s) that caused the error, when the API can attribute it. */
  readonly field?: string | string[];

  /** The raw issue payload, for callers that need the full detail. */
  readonly issue?: Issue;

  constructor(args: {
    message: string;
    status: number;
    code?: string;
    field?: string | string[];
    issue?: Issue;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.field = args.field;
    this.issue = args.issue;
  }
}

/**
 * Reduces an unknown thrown value to a user-facing message string. Returns the
 * message of an {@link ApiError} or any other `Error`, falling back to the given
 * `fallback` for non-error throwables.
 */
export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Collapses an `Issue.message` (string | string[] | undefined) into a single
 * human-readable string for the {@link ApiError} `message`.
 */
export function issueMessageToString(
  message: Issue['message'],
  fallback: string,
): string {
  if (Array.isArray(message)) {
    return message.length > 0 ? message.join('; ') : fallback;
  }
  return message ?? fallback;
}
