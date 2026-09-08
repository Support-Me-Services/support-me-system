import { isAxiosError } from "axios";

/**
 * api-gateway's GrpcExceptionHandler returns a Spring ProblemDetail body
 * ({ detail, status, title, instance }) for every error response - see
 * backend/api-gateway/.../GrpcExceptionHandler.java.
 */
interface ProblemDetail {
  detail?: string;
  title?: string;
}

/** Extracts a user-displayable message from an api-client error, falling back to a generic one. */
export function getErrorMessage(error: unknown, fallback = "Wystąpił nieoczekiwany błąd."): string {
  if (isAxiosError<ProblemDetail>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.title ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
