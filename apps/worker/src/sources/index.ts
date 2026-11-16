import type { Source } from "./types.js";

export type { IngestedEvent, Source } from "./types.js";

/** Sources registered with the scheduler. Each feed lives in its own module. */
export const sources: readonly Source[] = [];
