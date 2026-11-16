export { createDb, type CreateDbOptions, type Database } from "./client.js";
export * from "./schema/index.js";

// Re-exported so consumers share this package's drizzle-orm instance instead of
// resolving their own copy, which would make SQL objects type-incompatible.
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
