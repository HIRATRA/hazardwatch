# 0009. Email alerts to confirmed addresses from the worker

- Status: Accepted
- Date: 2026-11-17

## Context

Alerts only show up in the application, so users miss them while they are
away, which is when they matter most. Email reaches them anywhere, but it
raises three questions.

**Who receives it.** Accounts are created with any address and nothing
proved it belongs to its owner. Emailing alerts to unconfirmed addresses
would let anyone point a busy zone at someone else's inbox.

**Who sends it.** The web application handles requests and may run on a
serverless platform, where background work is cut short. The worker is
long-running and already raises the alerts.

**How it is delivered.** Providers offer proprietary APIs, but all of them
also accept SMTP, as do the tools that catch email in development.

## Decision

- Better Auth confirms addresses with a link sent on sign-up. Alerts are
  only emailed to confirmed addresses. Signing in does not require one.
- The worker sends alert emails. Every two minutes, it claims the alerts
  that are unread, raised less than a day ago, not emailed yet, in a zone
  with email alerts on and owned by a confirmed address. It sends each user
  one email listing them, the first ten in full.
- `zone_alerts.emailed_at` serves as the queue. Claiming sets it in one
  statement that locks rows with `FOR UPDATE SKIP LOCKED`, so concurrent
  workers never send the same alert. A failed email clears it again for the
  next pass, and raising an alert again clears it too.
- Both applications send through SMTP with Nodemailer, configured by
  `SMTP_URL`. Mailpit catches every email in development. Without
  `SMTP_URL`, nothing is sent and the rest works as before.
- Templates live in `@hazardwatch/email`, shared by both applications, each
  with a plain text and an HTML version.

## Consequences

- Nobody can receive alerts they did not ask for, and users who never
  confirm their address keep in-app alerts.
- An alert is emailed at most two minutes after it is raised, and alerts
  that arrive together share one email instead of flooding the inbox.
- If the worker stops between claiming alerts and sending them, those
  emails are lost: claiming first favours never sending twice over never
  missing one, which suits alerts that are also in the app.
- Any provider works without code changes, and switching only changes
  `SMTP_URL`.
- Alerts that wait more than a day, for instance while the email server is
  down, are no longer emailed.
