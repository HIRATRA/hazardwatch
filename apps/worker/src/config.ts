import { z } from "zod";

/**
 * An empty value means the variable is not set, as in a .env file or a
 * hosting dashboard where a field was left blank.
 */
const unsetIfEmpty = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    /** SMTP server for alert emails. Without it, alerts are not emailed. */
    SMTP_URL: unsetIfEmpty(z.url({ protocol: /^smtps?$/ }).optional()),
    EMAIL_FROM: unsetIfEmpty(
      z.string().min(1).default("HazardWatch <alerts@hazardwatch.localhost>"),
    ),
    /** Public URL of the web application, for the links in emails. */
    APP_URL: unsetIfEmpty(z.url({ protocol: /^https?$/ }).optional()),
    /**
     * VAPID keys that sign push notifications, the public one shared with
     * the web application. Without them, alerts are not pushed.
     */
    VAPID_PUBLIC_KEY: unsetIfEmpty(z.string().min(1).optional()),
    VAPID_PRIVATE_KEY: unsetIfEmpty(z.string().min(1).optional()),
    /**
     * Contact for push services, as a mailto: or https: URL. Defaults to
     * APP_URL when it uses https.
     */
    VAPID_SUBJECT: unsetIfEmpty(z.url({ protocol: /^(mailto|https)$/ }).optional()),
    /**
     * Port of the health endpoint, which hosts that run the worker as a web
     * service require. Without it, the worker opens no port.
     */
    PORT: unsetIfEmpty(z.coerce.number().int().min(0).max(65_535).optional()),
  })
  .refine((config) => !config.SMTP_URL || config.APP_URL, {
    message: "APP_URL is required to send email, for the links it contains",
    path: ["APP_URL"],
  })
  .refine((config) => !config.VAPID_PUBLIC_KEY === !config.VAPID_PRIVATE_KEY, {
    message: "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY go together",
    path: ["VAPID_PRIVATE_KEY"],
  })
  .refine((config) => !config.VAPID_PRIVATE_KEY || pushContact(config), {
    message:
      "VAPID_SUBJECT is required to push unless APP_URL uses https, as a contact for push services",
    path: ["VAPID_SUBJECT"],
  });

export type Config = z.infer<typeof configSchema>;

/**
 * The contact push services may reach about the notifications sent, which
 * they only accept as an https: or mailto: URL.
 */
export function pushContact(config: {
  VAPID_SUBJECT?: string | undefined;
  APP_URL?: string | undefined;
}): string | undefined {
  if (config.VAPID_SUBJECT) {
    return config.VAPID_SUBJECT;
  }
  return config.APP_URL?.startsWith("https:") ? config.APP_URL : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
