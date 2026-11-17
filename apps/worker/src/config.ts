import { z } from "zod";

/** An empty value in a .env file means the variable is not set. */
const optional = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    /** SMTP server for alert emails. Without it, alerts are not emailed. */
    SMTP_URL: optional(z.url({ protocol: /^smtps?$/ })),
    EMAIL_FROM: z.string().min(1).default("HazardWatch <alerts@hazardwatch.localhost>"),
    /** Public URL of the web application, for the links in emails. */
    APP_URL: optional(z.url({ protocol: /^https?$/ })),
  })
  .refine((config) => !config.SMTP_URL || config.APP_URL, {
    message: "APP_URL is required to send email, for the links it contains",
    path: ["APP_URL"],
  });

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
