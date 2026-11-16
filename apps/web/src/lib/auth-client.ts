import { createAuthClient } from "better-auth/react";

// The client talks to the same origin, so no base URL is needed.
export const authClient = createAuthClient();
