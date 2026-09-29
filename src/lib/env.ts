import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  TEST_DATABASE_URL: z.string().url().startsWith("postgresql://").optional(),
  DEMO_PARENT_ID: z.string().uuid(),
});

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  if (source === process.env && cachedEnvironment) return cachedEnvironment;

  const parsed = environmentSchema.parse(source);
  if (source === process.env) cachedEnvironment = parsed;
  return parsed;
}
