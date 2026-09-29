export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "STUDENT_NOT_FOUND"
  | "CLASS_NOT_FOUND"
  | "BOOKING_NOT_FOUND"
  | "DUPLICATE_ACTIVE_BOOKING"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_BOOKING_TRANSITION"
  | "CAPACITY_UNAVAILABLE";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
