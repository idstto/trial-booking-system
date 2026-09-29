import { z } from "zod";

import { getBookingService } from "@/application/composition";
import { dataResponse, handleRoute } from "@/lib/http";

const classIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ classId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const { classId } = await context.params;
    const roster = await getBookingService().listRoster(classIdSchema.parse(classId));
    return dataResponse(roster, requestId);
  });
}
