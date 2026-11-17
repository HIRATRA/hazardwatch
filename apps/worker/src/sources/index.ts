import { createGdacsSource } from "./gdacs/source.js";
import type { Source } from "./types.js";
import { createUsgsSource } from "./usgs/source.js";

export type { FetchContext, IngestedEvent, Source } from "./types.js";

/** Sources registered with the scheduler. Each feed lives in its own module. */
export const sources: readonly Source[] = [createUsgsSource(), createGdacsSource()];
