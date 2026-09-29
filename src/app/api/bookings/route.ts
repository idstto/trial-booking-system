import { z } from "zod";

import { getBookingService } from "@/application/composition";
import { getEnvironment } from "@/lib/env";
import { dataResponse, getIdempotencyKey, handleRoute, parseJson } from "@/lib/http";

const createBookingSchema = z.strictObject({
  studentId: z.string().uuid(),
  trialClassId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const body = await parseJson(request, createBookingSchema);
    const booking = await getBookingService().createBooking({
      parentId: getEnvironment().DEMO_PARENT_ID,
      studentId: body.studentId,
      trialClassId: body.trialClassId,
      requestKey: getIdempotencyKey(request),
    });
    return dataResponse(booking, requestId, 201);
  });
}
