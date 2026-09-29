CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trial_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  starts_at timestamptz NOT NULL,
  capacity smallint NOT NULL CONSTRAINT trial_classes_capacity_positive CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  trial_class_id uuid NOT NULL REFERENCES trial_classes(id),
  status text NOT NULL CHECK (status IN (
    'pending_payment', 'confirmed', 'payment_failed', 'capacity_unavailable', 'cancelled'
  )),
  request_key text NOT NULL UNIQUE CHECK (length(request_key) >= 8),
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  CONSTRAINT bookings_confirmed_at_consistent CHECK (
    (status = 'confirmed' AND confirmed_at IS NOT NULL)
    OR (status <> 'confirmed' AND confirmed_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_student_class
ON bookings (student_id, trial_class_id)
WHERE status IN ('pending_payment', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_class_status_idx
ON bookings (trial_class_id, status);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) >= 8),
  request_fingerprint text NOT NULL,
  provider_reference text UNIQUE,
  result text NOT NULL CHECK (result IN ('succeeded', 'failed')),
  amount_minor integer NOT NULL DEFAULT 2500 CHECK (amount_minor >= 0),
  booking_status text NOT NULL CHECK (booking_status IN (
    'confirmed', 'payment_failed', 'capacity_unavailable'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);
