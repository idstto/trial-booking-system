import { getBookingService } from "@/application/composition";
import { dataResponse, handleRoute } from "@/lib/http";

export async function GET(): Promise<Response> {
  return handleRoute(async (requestId) =>
    dataResponse(await getBookingService().listTrialClasses(), requestId),
  );
}
