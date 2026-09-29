export const bookingStatuses = [
  "pending_payment",
  "confirmed",
  "payment_failed",
  "capacity_unavailable",
  "cancelled",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export const paymentResults = ["succeeded", "failed"] as const;

export type PaymentResult = (typeof paymentResults)[number];

const terminalStatuses = new Set<BookingStatus>([
  "confirmed",
  "payment_failed",
  "capacity_unavailable",
  "cancelled",
]);

export function isTerminalStatus(status: BookingStatus): boolean {
  return terminalStatuses.has(status);
}

export function canApplyPaymentResult(status: BookingStatus): boolean {
  return status === "pending_payment";
}

export interface BookingRecord {
  id: string;
  studentId: string;
  trialClassId: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
}
