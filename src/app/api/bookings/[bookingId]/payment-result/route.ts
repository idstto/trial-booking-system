import { z } from "zod";

import { getBookingService } from "@/application/composition";
import { getEnvironment } from "@/lib/env";
import { dataResponse, getIdempotencyKey, handleRoute, parseJson } from "@/lib/http";

const bookingIdSchema = z.string().uuid();
const paymentResultSchema = z.strictObject({ result: z.enum(["succeeded", "failed"]) });

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const { bookingId } = await context.params;
    const body = await parseJson(request, paymentResultSchema);
    const booking = await getBookingService().applyPaymentResult({
      parentId: getEnvironment().DEMO_PARENT_ID,
      bookingId: bookingIdSchema.parse(bookingId),
      idempotencyKey: getIdempotencyKey(request),
      result: body.result,
    });
    return dataResponse(booking, requestId);
  });
}
