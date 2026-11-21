# Deployment

HazardWatch runs on three hosted services and, optionally, an email
provider. Each part can be replaced by an equivalent one, since they only
talk through PostgreSQL and standard protocols.

| Part     | Service           | Why                                                          |
| -------- | ----------------- | ------------------------------------------------------------ |
| Web app  | Vercel            | Next.js hosting with deploys on every push                   |
| Worker   | Render, free plan | A long-running process, which serverless platforms cut short |
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

Render applies migrations at the end of each build of the worker. To apply
them by hand, for instance before the web app's first deploy, run from the
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

Add these environment variables, ticking both **Production** and **Preview**
unless noted. Without them, the build of every branch fails:

| Variable             | Value                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon's pooled connection string                                                       |
| `BETTER_AUTH_SECRET` | A new secret, from `openssl rand -base64 32`                                          |
| `BETTER_AUTH_URL`    | Production only: the domain with its scheme, such as `https://hazardwatch.vercel.app` |
| `SMTP_URL`           | Optional, see [Email](#4-email). Without it, no email is sent                         |
| `EMAIL_FROM`         | Optional, the sender of every email                                                   |
| `VAPID_PUBLIC_KEY`   | Optional, see [Push notifications](#5-push-notifications)                             |

The build validates these variables and stops when one is missing or
invalid, rather than shipping an app that fails at its first request. A
change to a variable applies from the next deploy.

Preview deployments use their own URLs instead of `BETTER_AUTH_URL`, read
from the system variables Vercel exposes by default, so that signing in
works on them too. They share the production database, so accounts and
zones created on a preview are real.

## 3. Worker on Render

Render's background workers need a paid plan, so the worker runs as a free
web service instead (see
[ADR 0010](adr/0010-run-the-worker-as-a-free-render-web-service.md)).
Render sets `PORT`, and the worker answers health checks on `/health`.

[`render.yaml`](../render.yaml) describes the service as a Render Blueprint.
In the Render dashboard, choose **New**, then **Blueprint**, and select the
repository. Render reads the file and asks for the values kept out of it:

| Variable                                | Value                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                          | Neon's direct connection string                                        |
| `APP_URL`                               | The web app's production domain, for the links in alert emails         |
| `SMTP_URL`                              | Optional. Left empty, alerts stay in the app                           |
| `EMAIL_FROM`                            | Optional, the sender of alert emails                                   |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional, see [Push notifications](#5-push-notifications)              |
| `VAPID_SUBJECT`                         | Optional, a `mailto:` contact for push services. Defaults to `APP_URL` |

Render then builds the worker, applies migrations and starts it. Its logs
show one JSON line per ingestion pass, such as `"msg":"ingestion
succeeded"`, and the first pass fills the map within a minute.

Render only asks for these values when the Blueprint is created. Change
them later on the worker's **Environment** page.

### Keeping the worker awake

A free web service sleeps after 15 minutes without inbound requests, which
would stop ingestion. Point an uptime monitor at the worker, for instance a
free UptimeRobot HTTP monitor:

- **URL:** `https://<worker service>.onrender.com/health`, shown at the top
  of the service's page on Render.
- **Interval:** 5 minutes.

The monitor also tells you when the worker goes down.

Render grants 750 free hours a month per workspace, and an always-on
service uses about 730 of them. Keep the worker alone on the free plan of
its workspace: when the hours run out, Render suspends every free service
until the next month.

To move to a paid background worker later, set `type: worker` and remove
`plan`, `healthCheckPath` and the migration from the build in
`render.yaml`, then add `preDeployCommand: node packages/db/dist/migrate.js`.
The uptime monitor is no longer needed.

## 4. Email

Any SMTP provider works. Two constraints shape the choice: Render's free
services cannot reach ports 25, 465 and 587, and most providers only send
from a domain you own.

**Without a domain: Brevo.** Its free plan sends 300 emails a day from a
single confirmed address, and its relay also listens on port 2525.

1. Create a Brevo account, then add and confirm the sender address under
   **Senders, domains and dedicated IPs**.
2. Under **SMTP and API**, note the SMTP login and generate an SMTP key.
3. Set the variables below on both Vercel, for address confirmations and
   password resets, and Render, for alert emails:

| Variable     | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| `SMTP_URL`   | `smtp://<SMTP login>:<SMTP key>@smtp-relay.brevo.com:2525` |
| `EMAIL_FROM` | `HazardWatch <the confirmed sender address>`               |

The SMTP login is not an address to send from: `EMAIL_FROM` must be the
confirmed sender.

**With a domain: Resend.** Verify the domain, create an API key and use
`smtps://resend:<API key>@smtp.resend.com:2465`, with an address on that
domain in `EMAIL_FROM`. Port 2465 works from Render too.

Alerts are only emailed to confirmed addresses, so without email nobody
receives them by email, but the rest of the app works.

## 5. Push notifications

Browsers deliver push notifications through their vendor's push service,
free of charge and without an account. The worker signs them with a VAPID
key pair, which you generate once:

```sh
pnpm --filter @hazardwatch/worker exec web-push generate-vapid-keys
```

Set the public key on both Vercel and Render as `VAPID_PUBLIC_KEY`, and
the private key on Render only as `VAPID_PRIVATE_KEY`. Keep the private
key with your other secrets: a new pair forces every browser to turn
notifications on again. Push services may contact you about the
notifications you send, at `VAPID_SUBJECT` or, when it is not set, at
`APP_URL`, which must then use https.

Without the keys, the alerts page offers no notifications and the worker
sends none. On iPhone and iPad, notifications only work once the app is
added to the Home Screen from Safari's Share menu.

## 6. Checking a deployment

- `https://<your domain>/api/health` answers `{"status":"ok"}` once the
  web app reaches the database, and `503` otherwise.
- `https://<worker service>.onrender.com/health` answers
  `{"status":"ok",…}` while the worker runs.
- The live map shows events after the worker's first pass.
- Signing up sends a confirmation email when `SMTP_URL` is set.
- With the VAPID keys set, the alerts page offers to turn notifications on,
  and the worker's logs show `"msg":"alert notifications pushed"` when an
  alert reaches a subscribed user.

## Updating

Pushing to `main` redeploys the web app on Vercel. Render redeploys the
worker once the CI checks pass, and only when the worker, the shared
packages or the dependencies changed, applying new migrations during the
build.

Vercel may deploy the web app before Render applies a migration it needs.
Write migrations that the running code tolerates, such as adding a column
before using it, or apply them by hand before merging.
