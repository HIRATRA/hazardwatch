/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["web", "worker", "db", "email", "auth", "ui", "deps", "github", "release"],
    ],
  },
};
