import { BookingService } from "@/application/booking-service";
import { getSqlClient } from "@/infrastructure/db/client";
import { PostgresBookingUnitOfWork } from "@/infrastructure/db/repositories";

let bookingService: BookingService | undefined;

export function getBookingService(): BookingService {
  bookingService ??= new BookingService(new PostgresBookingUnitOfWork(getSqlClient()));
  return bookingService;
}
