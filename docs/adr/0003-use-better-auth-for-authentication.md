# 0003. Use Better Auth for authentication

- Status: Accepted
- Date: 2026-11-16

## Context

Users need accounts to save watch zones and receive alerts. Authentication
is security-critical and should not be written from scratch, but user data
should stay in our own database rather than with a hosted identity
provider.

## Decision

Use Better Auth, mounted as a Next.js route handler and backed by the
application database through its Drizzle adapter.

- Email and password sign-in is enabled first, with a minimum password
  length of 10 characters.
- Sessions are stored in PostgreSQL. A signed cookie cache avoids a
  database round trip on every request.
- Server code reads the session through a single helper, and protected
  pages call `requireSession()`.

## Consequences

- Accounts and sessions live in the same database as the rest of the data,
  with no per-user pricing or vendor lock-in.
- OAuth providers, email verification and two-factor authentication can be
  added through Better Auth plugins without changing the data model.
- The project owns operational concerns that a hosted provider would cover,
  such as transactional email delivery and abuse protection.
