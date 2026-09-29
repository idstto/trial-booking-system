import { getBookingService } from "@/application/composition";
import { dataResponse, handleRoute } from "@/lib/http";
import { getEnvironment } from "@/lib/env";

export async function GET(): Promise<Response> {
  return handleRoute(async (requestId) => {
    const students = await getBookingService().listStudents(getEnvironment().DEMO_PARENT_ID);
    return dataResponse(students, requestId);
  });
}
