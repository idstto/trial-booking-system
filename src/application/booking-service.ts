import { commandFingerprint } from "@/application/idempotency";
import type {
  BookingUnitOfWork,
  RosterEntry,
  StudentSummary,
  TrialClassSummary,
} from "@/application/ports";
import { canApplyPaymentResult, type BookingRecord, type PaymentResult } from "@/domain/booking";
import { DomainError } from "@/domain/errors";

export interface CreateBookingCommand {
  parentId: string;
  studentId: string;
  trialClassId: string;
  requestKey: string;
}

export interface ApplyPaymentResultCommand {
  parentId: string;
  bookingId: string;
  idempotencyKey: string;
  result: PaymentResult;
}

export class BookingService {
  constructor(private readonly unitOfWork: BookingUnitOfWork) {}

  listStudents(parentId: string): Promise<StudentSummary[]> {
    return this.unitOfWork.run((repository) => repository.listStudents(parentId));
  }

  listTrialClasses(): Promise<TrialClassSummary[]> {
    return this.unitOfWork.run((repository) => repository.listTrialClasses());
  }

  getBooking(bookingId: string, parentId: string): Promise<BookingRecord> {
    return this.unitOfWork.run(async (repository) => {
      const booking = await repository.findBookingById(bookingId, parentId);
      if (!booking) throw new DomainError("BOOKING_NOT_FOUND", "Booking was not found");
      return booking;
    });
  }

  listRoster(trialClassId: string): Promise<RosterEntry[]> {
    return this.unitOfWork.run(async (repository) => {
      if (!(await repository.trialClassExists(trialClassId))) {
        throw new DomainError("CLASS_NOT_FOUND", "Trial class was not found");
      }
      return repository.listRoster(trialClassId);
    });
  }

  createBooking(command: CreateBookingCommand): Promise<BookingRecord> {
    const fingerprint = commandFingerprint({
      studentId: command.studentId,
      trialClassId: command.trialClassId,
    });

    return this.unitOfWork.run(async (repository) => {
      const replay = await repository.findBookingByRequestKey(command.requestKey);
      if (replay) {
        if (replay.requestFingerprint !== fingerprint) {
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was already used with a different booking payload",
          );
        }
        return replay;
      }
      if (!(await repository.studentBelongsToParent(command.studentId, command.parentId))) {
        throw new DomainError("STUDENT_NOT_FOUND", "Student was not found");
      }
      if (!(await repository.trialClassExists(command.trialClassId))) {
        throw new DomainError("CLASS_NOT_FOUND", "Trial class was not found");
      }

      const active = await repository.findActiveBooking(command.studentId, command.trialClassId);
      if (active) {
        throw new DomainError(
          "DUPLICATE_ACTIVE_BOOKING",
          "This child already has an active booking for the class",
        );
      }

      const created = await repository.createPendingBooking({
        studentId: command.studentId,
        trialClassId: command.trialClassId,
        requestKey: command.requestKey,
        requestFingerprint: fingerprint,
      });
      if (created) return created;

      const racedReplay = await repository.findBookingByRequestKey(command.requestKey);
      if (racedReplay) {
        if (racedReplay.requestFingerprint !== fingerprint) {
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was concurrently used with a different booking payload",
          );
        }
        return racedReplay;
      }

      throw new DomainError(
        "DUPLICATE_ACTIVE_BOOKING",
        "This child already has an active booking for the class",
      );
    });
  }

  applyPaymentResult(command: ApplyPaymentResultCommand): Promise<BookingRecord> {
    const fingerprint = commandFingerprint({
      bookingId: command.bookingId,
      result: command.result,
    });

    return this.unitOfWork.run(async (repository) => {
      const booking = await repository.lockBookingById(command.bookingId, command.parentId);
      if (!booking) throw new DomainError("BOOKING_NOT_FOUND", "Booking was not found");
      const replay = await repository.findPaymentAttempt(command.idempotencyKey);
      if (replay) {
        if (replay.bookingId !== booking.id || replay.requestFingerprint !== fingerprint) {
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was already used with a different payment payload",
          );
        }
        return booking;
      }
      if (!canApplyPaymentResult(booking.status)) {
        throw new DomainError(
          "INVALID_BOOKING_TRANSITION",
          `Booking in ${booking.status} cannot accept another payment result`,
        );
      }

      let outcome: "confirmed" | "payment_failed" | "capacity_unavailable";
      if (command.result === "failed") {
        outcome = "payment_failed";
      } else {
        const trialClass = await repository.lockTrialClass(booking.trialClassId);
        if (!trialClass) throw new DomainError("CLASS_NOT_FOUND", "Trial class was not found");
        const confirmedCount = await repository.countConfirmed(booking.trialClassId);
        outcome = confirmedCount < trialClass.capacity ? "confirmed" : "capacity_unavailable";
      }

      await repository.createPaymentAttempt({
        bookingId: booking.id,
        idempotencyKey: command.idempotencyKey,
        requestFingerprint: fingerprint,
        result: command.result,
        amountMinor: 2500,
        bookingStatus: outcome,
      });
      return repository.updateBookingStatus(booking.id, outcome);
    });
  }
}
