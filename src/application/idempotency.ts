import { createHash } from "node:crypto";

export function commandFingerprint(value: Record<string, string>): string {
  const canonical = Object.keys(value)
    .sort()
    .map((key) => `${key}:${value[key]}`)
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}
