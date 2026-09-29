# Quickstart and Validation

## Prerequisites

- Node.js 24+
- pnpm 10+
- Docker with Compose

## Start from a fresh clone

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The page identifies the seeded demo parent and provides the booking and
roster flow. Availability is a snapshot; confirmation is the authoritative result.

## Automated quality gates

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:race
```

`test:race` repeats the final-seat scenario 100 times against PostgreSQL. Every iteration must finish
with exactly one new confirmation and total confirmed occupancy equal to four.

## Manual validation scenarios

1. Select a child and an available class, create a booking, simulate success, and confirm that the
   status and roster update.
2. Create another booking, simulate failure, and confirm that the roster does not change.
3. Repeat a command with the same key and verify that the same stored result is returned.
4. Attempt a duplicate active child/class booking and verify the stable conflict response.
5. Run the race test and inspect that the two outcomes are `confirmed` and
   `capacity_unavailable` while the roster remains at capacity.

Expected HTTP shapes and error codes are defined in [contracts/openapi.yaml](./contracts/openapi.yaml).
Schema constraints and state transitions are defined in [data-model.md](./data-model.md).
