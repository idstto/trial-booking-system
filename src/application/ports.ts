import type { BookingRecord, BookingStatus, PaymentResult } from "@/domain/booking";

export interface StudentSummary {
  id: string;
  name: string;
}

export interface TrialClassSummary {
  id: string;
  title: string;
  startsAt: Date;
  capacity: number;
  confirmedCount: number;
  availableSeats: number;
}

export interface RosterEntry {
  bookingId: string;
  studentId: string;
  studentName: string;
  confirmedAt: Date;
}

export interface CreatePendingBookingRecord {
  studentId: string;
  trialClassId: string;
  requestKey: string;
  requestFingerprint: string;
}

export interface CreatePaymentAttemptRecord {
  bookingId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  result: PaymentResult;
  amountMinor: number;
  bookingStatus: Exclude<BookingStatus, "pending_payment" | "cancelled">;
}

export interface StoredPaymentAttempt {
  id: string;
  bookingId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  result: PaymentResult;
  bookingStatus: BookingStatus;
}

export interface BookingRepository {
  listStudents(parentId: string): Promise<StudentSummary[]>;
  listTrialClasses(): Promise<TrialClassSummary[]>;
  studentBelongsToParent(studentId: string, parentId: string): Promise<boolean>;
  trialClassExists(trialClassId: string): Promise<boolean>;
  findBookingById(bookingId: string, parentId: string): Promise<BookingRecord | null>;
  lockBookingById(bookingId: string, parentId: string): Promise<BookingRecord | null>;
  findBookingByRequestKey(requestKey: string): Promise<(BookingRecord & { requestFingerprint: string }) | null>;
  findActiveBooking(studentId: string, trialClassId: string): Promise<BookingRecord | null>;
  createPendingBooking(input: CreatePendingBookingRecord): Promise<BookingRecord | null>;
  findPaymentAttempt(idempotencyKey: string): Promise<StoredPaymentAttempt | null>;
  lockTrialClass(trialClassId: string): Promise<{ id: string; capacity: number } | null>;
  countConfirmed(trialClassId: string): Promise<number>;
  createPaymentAttempt(input: CreatePaymentAttemptRecord): Promise<StoredPaymentAttempt>;
  updateBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingRecord>;
  listRoster(trialClassId: string): Promise<RosterEntry[]>;
}

export interface BookingUnitOfWork {
  run<T>(work: (repository: BookingRepository) => Promise<T>): Promise<T>;
}
