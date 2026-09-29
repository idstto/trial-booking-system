"use client";

import { useEffect, useMemo, useState } from "react";

type Student = { id: string; name: string };
type TrialClass = {
  id: string;
  title: string;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  availableSeats: number;
};
type Booking = { id: string; status: string };
type RosterEntry = {
  bookingId: string;
  studentId: string;
  studentName: string;
  confirmedAt: string;
};
type DataEnvelope<T> = { data: T; requestId: string };
type ErrorEnvelope = { error: { code: string; message: string }; requestId: string };

export function BookingFlow() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<TrialClass[]>([]);
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = useMemo(
    () => classes.find((trialClass) => trialClass.id === classId),
    [classes, classId],
  );

  useEffect(() => {
    void loadChoices();
  }, []);

  useEffect(() => {
    if (classId) void loadRoster(classId);
  }, [classId]);

  async function loadChoices() {
    try {
      const [studentResponse, classResponse] = await Promise.all([
        request<Student[]>("/api/students"),
        request<TrialClass[]>("/api/trial-classes"),
      ]);
      setStudents(studentResponse);
      setClasses(classResponse);
      setStudentId((current) => current || studentResponse[0]?.id || "");
      setClassId((current) => current || classResponse[0]?.id || "");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function loadRoster(nextClassId: string) {
    try {
      setRoster(await request<RosterEntry[]>(`/api/trial-classes/${nextClassId}/roster`));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function createBooking() {
    setBusy(true);
    setError("");
    try {
      const created = await request<Booking>("/api/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ studentId, trialClassId: classId }),
      });
      setBooking(created);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function applyPayment(result: "succeeded" | "failed") {
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const updated = await request<Booking>(`/api/bookings/${booking.id}/payment-result`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ result }),
      });
      setBooking(updated);
      await Promise.all([loadRoster(classId), loadChoices()]);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="booking-grid">
      <section className="panel" aria-labelledby="booking-heading">
        <p className="eyebrow">Parent booking</p>
        <h2 id="booking-heading">Choose a child and trial class</h2>

        <label htmlFor="student">Child</label>
        <select id="student" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>

        <label htmlFor="trial-class">Trial class</label>
        <select
          id="trial-class"
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setBooking(null);
          }}
        >
          {classes.map((trialClass) => (
            <option key={trialClass.id} value={trialClass.id}>
              {trialClass.title}
            </option>
          ))}
        </select>

        {selectedClass && (
          <div className="availability">
            <strong>{selectedClass.availableSeats} seats available</strong>
            <span>
              {new Date(selectedClass.startsAt).toLocaleString()} · capacity {selectedClass.capacity}
            </span>
            <small>Availability is confirmed only after payment simulation.</small>
          </div>
        )}

        {!booking ? (
          <button disabled={busy || !studentId || !classId} onClick={createBooking}>
            {busy ? "Creating…" : "Create booking"}
          </button>
        ) : (
          <div className="status-card" aria-live="polite">
            <span>Booking status</span>
            <strong>{booking.status.replaceAll("_", " ")}</strong>
            {booking.status === "pending_payment" && (
              <div className="button-row">
                <button disabled={busy} onClick={() => applyPayment("succeeded")}>
                  Simulate successful payment
                </button>
                <button className="secondary" disabled={busy} onClick={() => applyPayment("failed")}>
                  Simulate failed payment
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="roster-heading">
        <p className="eyebrow">Staff view</p>
        <h2 id="roster-heading">Confirmed roster</h2>
        <p className="muted">Only confirmed bookings appear here.</p>
        {roster.length === 0 ? (
          <p className="empty">No confirmed students yet.</p>
        ) : (
          <ol className="roster">
            {roster.map((entry) => (
              <li key={entry.bookingId}>{entry.studentName}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as DataEnvelope<T> | ErrorEnvelope;
  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error.message : "Request failed");
  }
  return body.data;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
