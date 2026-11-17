import { applyMigrations } from "./migrations.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

await applyMigrations(url);
console.log("Migrations applied");
