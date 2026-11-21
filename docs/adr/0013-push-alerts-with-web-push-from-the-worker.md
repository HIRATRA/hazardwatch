# 0013. Push alerts with Web Push from the worker

- Status: Accepted
- Date: 2026-11-21

## Context

Alert emails arrive within two minutes, but people rarely watch their
inbox, and a hazard matters most in the minutes after it starts. A
notification on the phone or the desktop reaches them sooner. Three
questions shape how to send one.

**Which channel.** Native apps and messaging services need accounts,
review processes or paid plans. The Web Push protocol is built into
browsers: Chrome, Edge and Firefox on every platform, Safari on macOS, and
Safari on iPhone and iPad for web apps added to the Home Screen. Each
browser vendor runs its push service for free, and messages are signed
with a key pair the application owns (VAPID), so no third-party account is
needed.

**Who sends it.** As for email (see
[ADR 0009](0009-email-alerts-to-confirmed-addresses-from-the-worker.md)),
the worker already raises the alerts and runs continuously, while the web
application may run where background work is cut short.

**Who receives it.** A browser only subscribes after its user grants the
permission, on a device they hold, so nobody can point notifications at
someone else, unlike an email address.

## Decision

- Browsers subscribe from the alerts page, which registers a service
  worker and stores the subscription in `push_subscriptions`, one row per
  browser, keyed by its push service endpoint. Signing out removes the
  current browser's subscription, so a shared device stops receiving the
  account's alerts.
- The worker pushes alerts with the `web-push` library. Every minute, it
  claims the unread alerts raised less than an hour ago for users with at
  least one subscription, and sends each user one notification to each of
  their browsers. A single alert opens its event, several open the alerts
  page.
- `zone_alerts.pushed_at` serves as the queue, claimed with
  `FOR UPDATE SKIP LOCKED` like `emailed_at`. Raising an alert again
  clears both. Push does not wait for a confirmed address or depend on a
  zone's email setting.
- A push service answering 404 or 410 means the browser is gone, and its
  subscription is deleted. When none of a user's browsers can be reached
  for another reason, their alerts go back in the queue.
- The key pair comes from `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. The
  worker holds both, the web application only the public one. Without
  them, the alerts page offers no notifications and the worker sends none.
- A web app manifest and application icons make HazardWatch installable,
  which iPhones and iPads require before they deliver notifications.

## Consequences

- Alerts reach users within a minute, on any device where they turned
  notifications on, at no cost and without a third-party account.
- Notifications are a per-device choice made in the browser. A user who
  never opens the alerts page on a device gets none there.
- Like emails, a notification lost between claiming and sending is not
  sent again, which suits alerts that are also in the app.
- Alerts older than an hour are never pushed, so that a device coming back
  online, or a user turning notifications on, does not receive stale news.
- Losing the private key means every browser has to subscribe again, so
  it is kept with the other secrets of the deployment.
