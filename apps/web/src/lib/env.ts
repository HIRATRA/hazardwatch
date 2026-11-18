import "server-only";

import { z } from "zod";

/**
 * An empty value means the variable is not set, as in a .env file or a
 * hosting dashboard where a field was left blank.
 */
const unsetIfEmpty = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  /** SMTP server for outgoing email. Without it, no email is sent. */
  SMTP_URL: unsetIfEmpty(z.url({ protocol: /^smtps?$/ }).optional()),
  EMAIL_FROM: unsetIfEmpty(z.string().min(1).default("HazardWatch <alerts@hazardwatch.localhost>")),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function parseEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv();
