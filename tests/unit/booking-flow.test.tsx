// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookingFlow } from "@/app/booking-flow";

afterEach(() => vi.restoreAllMocks());

describe("BookingFlow", () => {
  it("creates, pays, shows status, and refreshes the roster", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/students") {
        return Response.json({
          data: [{ id: "20000000-0000-4000-8000-000000000001", name: "Maya" }],
          requestId: "request-students",
        });
      }
      if (url === "/api/trial-classes") {
        return Response.json({
          data: [
            {
              id: "30000000-0000-4000-8000-000000000001",
              title: "Creative Mathematics",
              startsAt: "2026-10-05T02:00:00.000Z",
              capacity: 4,
              confirmedCount: 1,
              availableSeats: 3,
            },
          ],
          requestId: "request-classes",
        });
      }
      if (url.endsWith("/roster")) {
        return Response.json({ data: [], requestId: "request-roster" });
      }
      if (url === "/api/bookings" && init?.method === "POST") {
        return Response.json(
          {
            data: {
              id: "40000000-0000-4000-8000-000000000099",
              status: "pending_payment",
            },
            requestId: "request-create",
          },
          { status: 201 },
        );
      }
      if (url.endsWith("/payment-result") && init?.method === "POST") {
        return Response.json({
          data: {
            id: "40000000-0000-4000-8000-000000000099",
            status: "confirmed",
          },
          requestId: "request-payment",
        });
      }
      throw new Error(`Unexpected request ${url}`);
    });

    render(<BookingFlow />);

    expect(await screen.findByRole("option", { name: "Maya" })).toBeInTheDocument();
    expect(screen.getByText("3 seats available")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));
    expect(await screen.findByText("pending payment")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simulate successful payment" }));
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/roster"), undefined),
    );
  });
});
