import { z } from "zod";

import { getBookingService } from "@/application/composition";
import { getEnvironment } from "@/lib/env";
import { dataResponse, handleRoute } from "@/lib/http";

const bookingIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const { bookingId } = await context.params;
    const booking = await getBookingService().getBooking(
      bookingIdSchema.parse(bookingId),
      getEnvironment().DEMO_PARENT_ID,
    );
    return dataResponse(booking, requestId);
  });
}
