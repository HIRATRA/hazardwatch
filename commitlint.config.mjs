/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["web", "worker", "db", "auth", "ui", "deps", "github", "release"]],
  },
};
