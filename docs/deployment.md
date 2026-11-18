# Deployment

HazardWatch runs on three hosted services and, optionally, an email
provider. Each part can be replaced by an equivalent one, since they only
talk through PostgreSQL and standard protocols.

| Part     | Service           | Why                                                          |
| -------- | ----------------- | ------------------------------------------------------------ |
| Web app  | Vercel            | Next.js hosting with deploys on every push                   |
| Worker   | Render            | A long-running process, which serverless platforms cut short |
| Database | Neon              | Managed PostgreSQL with the PostGIS extension                |
| Email    | Any SMTP provider | Address confirmations and alert emails, Resend for instance  |

Keep them in the same region to limit latency. The steps below use US East:
AWS `us-east-1` on Neon, `iad1` on Vercel and Virginia on Render.

## 1. Database on Neon

Create a Neon project in AWS US East (N. Virginia). Neon offers two
connection strings for the same database:

- **Pooled**, whose host contains `-pooler`. The web app uses it, since
  serverless functions open many short-lived connections.
- **Direct**, with connection pooling turned off. The worker and the
  migrations use it, since they keep a session open.

Both end with `sslmode=require&channel_binding=require`, which the
PostgreSQL driver understands: paste them as they are.

Render applies migrations before each deploy of the worker. To apply them
by hand, for instance before the web app's first deploy, run from the
repository root:

```sh
DATABASE_URL="<direct connection string>" pnpm db:migrate
```

A variable set on the command line takes precedence over your `.env`, which
should keep pointing to the local database. The first migration enables
PostGIS.

## 2. Web app on Vercel

Import the GitHub repository in Vercel and set **Root Directory** to
`apps/web`. Vercel detects Next.js, pnpm and Turborepo on its own.

Add these environment variables for Production and Preview:

| Variable             | Value                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon's pooled connection string                                                 |
| `BETTER_AUTH_SECRET` | A new secret, from `openssl rand -base64 32`                                    |
| `BETTER_AUTH_URL`    | The production domain with its scheme, such as `https://hazardwatch.vercel.app` |
| `SMTP_URL`           | Optional, see [Email](#4-email). Without it, no email is sent                   |
| `EMAIL_FROM`         | Optional, the sender of every email                                             |

The build validates these variables and stops when one is missing or
invalid, rather than shipping an app that fails at its first request. A
change to a variable applies from the next deploy.

Signing in only works on the production domain: preview deployments have
their own URLs, which differ from `BETTER_AUTH_URL`.

## 3. Worker on Render

Render has no free instance type for background workers: the smallest paid
one is plenty for the worker.

[`render.yaml`](../render.yaml) describes the worker as a Render Blueprint.
In the Render dashboard, choose **New**, then **Blueprint**, and select the
repository. Render reads the file and asks for the values kept out of it:

| Variable       | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| `DATABASE_URL` | Neon's direct connection string                                |
| `APP_URL`      | The web app's production domain, for the links in alert emails |
| `SMTP_URL`     | Optional. Left empty, alerts stay in the app                   |
| `EMAIL_FROM`   | Optional, the sender of alert emails                           |

Render then builds the worker, applies migrations and starts it. Its logs
show one JSON line per ingestion pass, such as `"msg":"ingestion
succeeded"`, and the first pass fills the map within a minute.

Render only asks for these values when the Blueprint is created. Change
them later on the worker's **Environment** page.

## 4. Email

Any SMTP provider works. With Resend:

1. Verify a domain you own, which lets Resend send from it.
2. Create an API key.
3. Set the variables below on both Vercel, for address confirmations, and
   Render, for alert emails:

| Variable     | Value                                          |
| ------------ | ---------------------------------------------- |
| `SMTP_URL`   | `smtps://resend:<API key>@smtp.resend.com:465` |
| `EMAIL_FROM` | `HazardWatch <alerts@your-domain>`             |

Alerts are only emailed to confirmed addresses, so without email nobody
receives them by email, but the rest of the app works.

## 5. Checking a deployment

- `https://<your domain>/api/health` answers `{"status":"ok"}` once the
  web app reaches the database, and `503` otherwise.
- The live map shows events after the worker's first pass.
- Signing up sends a confirmation email when `SMTP_URL` is set.

## Updating

Pushing to `main` redeploys the web app on Vercel. Render redeploys the
worker once the CI checks pass, and only when the worker, the shared
packages or the dependencies changed, applying new migrations first.

Vercel may deploy the web app before Render applies a migration it needs.
Write migrations that the running code tolerates, such as adding a column
before using it, or apply them by hand before merging.
