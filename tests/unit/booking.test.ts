import { describe, expect, it } from "vitest";

import { canApplyPaymentResult, isTerminalStatus } from "@/domain/booking";
import { DomainError } from "@/domain/errors";

describe("booking state policy", () => {
  it("allows payment handling only while payment is pending", () => {
    expect(canApplyPaymentResult("pending_payment")).toBe(true);
    expect(canApplyPaymentResult("confirmed")).toBe(false);
    expect(canApplyPaymentResult("payment_failed")).toBe(false);
    expect(canApplyPaymentResult("capacity_unavailable")).toBe(false);
    expect(canApplyPaymentResult("cancelled")).toBe(false);
  });

  it.each(["confirmed", "payment_failed", "capacity_unavailable", "cancelled"] as const)(
    "treats %s as terminal",
    (status) => expect(isTerminalStatus(status)).toBe(true),
  );

  it("does not treat pending payment as terminal", () => {
    expect(isTerminalStatus("pending_payment")).toBe(false);
  });
});

describe("DomainError", () => {
  it("carries a stable code, safe message, and optional details", () => {
    const error = new DomainError("IDEMPOTENCY_CONFLICT", "Command key payload differs", {
      field: "Idempotency-Key",
    });

    expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(error.message).toBe("Command key payload differs");
    expect(error.details).toEqual({ field: "Idempotency-Key" });
    expect(error.name).toBe("DomainError");
  });
});
