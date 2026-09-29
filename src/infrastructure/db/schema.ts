import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const parents = pgTable(
  "parents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("parents_email_unique").on(table.email)],
);

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => parents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trialClasses = pgTable(
  "trial_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    capacity: smallint("capacity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("trial_classes_capacity_positive", sql`${table.capacity} > 0`)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    trialClassId: uuid("trial_class_id")
      .notNull()
      .references(() => trialClasses.id),
    status: text("status").notNull(),
    requestKey: text("request_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("bookings_request_key_unique").on(table.requestKey),
    uniqueIndex("bookings_one_active_student_class")
      .on(table.studentId, table.trialClassId)
      .where(sql`${table.status} IN ('pending_payment', 'confirmed')`),
    check(
      "bookings_confirmed_at_consistent",
      sql`(${table.status} = 'confirmed' AND ${table.confirmedAt} IS NOT NULL) OR (${table.status} <> 'confirmed' AND ${table.confirmedAt} IS NULL)`,
    ),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    providerReference: text("provider_reference"),
    result: text("result").notNull(),
    amountMinor: integer("amount_minor").notNull().default(2500),
    bookingStatus: text("booking_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_attempts_key_unique").on(table.idempotencyKey),
    uniqueIndex("payment_attempts_provider_reference_unique").on(table.providerReference),
    check("payment_attempts_amount_nonnegative", sql`${table.amountMinor} >= 0`),
  ],
);
