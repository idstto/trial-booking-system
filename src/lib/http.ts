import { ZodError, type ZodType } from "zod";

import { DomainError } from "@/domain/errors";
import { createRequestId } from "@/lib/request-id";

const statusByCode: Record<DomainError["code"], number> = {
  VALIDATION_ERROR: 400,
  STUDENT_NOT_FOUND: 404,
  CLASS_NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,
  DUPLICATE_ACTIVE_BOOKING: 409,
  IDEMPOTENCY_CONFLICT: 409,
  INVALID_BOOKING_TRANSITION: 409,
  CAPACITY_UNAVAILABLE: 409,
};

export function dataResponse(data: unknown, requestId: string, status = 200): Response {
  return Response.json({ data, requestId }, { status });
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

export function getIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 128) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key header must contain 8 to 128 characters",
    );
  }
  return key;
}

export async function handleRoute(
  operation: (requestId: string) => Promise<Response>,
): Promise<Response> {
  const requestId = createRequestId();
  try {
    return await operation(requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        new DomainError("VALIDATION_ERROR", "Request validation failed", {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
        requestId,
      );
    }
    if (error instanceof DomainError) return errorResponse(error, requestId);

    console.error("Unhandled route error", { requestId, error });
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected server error" }, requestId },
      { status: 500 },
    );
  }
}

function errorResponse(error: DomainError, requestId: string): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      requestId,
    },
    { status: statusByCode[error.code] },
  );
}
