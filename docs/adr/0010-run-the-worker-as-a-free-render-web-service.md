# 0010. Run the worker as a free Render web service

- Status: Accepted
- Date: 2026-11-18

## Context

The worker is a long-running process (see
[ADR 0004](0004-run-ingestion-in-a-dedicated-worker.md)). It polls USGS
every minute and GDACS every ten minutes, and emails alerts every two
minutes. HazardWatch is an open-source portfolio project, so the hosting
should cost nothing.

The free options considered all fall short in some way:

- **Render background workers** fit the worker exactly, but have no free
  instance type.
- **GitHub Actions on a schedule** could run one ingestion pass at a time,
  but GitHub's terms rule out using hosted runners as a serverless
  application, or for anything other than building, testing and deploying
  the project.
- **Vercel cron jobs** run at most once a day on the free plan.
- **Render free web services** run any process that listens on a port, but
  sleep after 15 minutes without inbound requests, share 750 hours a month
  across the workspace and cannot reach SMTP ports 465 and 587.

## Decision

The worker runs as a free Render web service:

- When `PORT` is set, the worker answers health checks on `/health`. Render
  sets it and probes the endpoint.
- An external uptime monitor calls `/health` every five minutes, which keeps
  the service from sleeping.
- Migrations run at the end of the build, since free services have no
  pre-deploy step.
- Email goes through a port free services can reach, such as 2465 for
  Resend.

## Consequences

- The worker runs for free, on the same code and Blueprint as a paid one.
- It depends on a third party to stay awake. If the monitor stops, the
  worker sleeps within 15 minutes and the map stops updating until the next
  request wakes it.
- One always-on service uses about 730 of the 750 free hours a month. Another
  free service in the same Render workspace would exhaust them, and Render
  would suspend every free service until the next month.
- Render advises against free instances for production. Moving to a paid
  background worker only means changing the service type and plan in
  `render.yaml`, and moving migrations back to a pre-deploy command.
