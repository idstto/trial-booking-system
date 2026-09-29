import { execSync } from "node:child_process";

export default function globalSetup(): void {
  execSync("pnpm db:migrate", { stdio: "inherit" });
  execSync("pnpm db:seed", { stdio: "inherit" });
}
