// Conventional Commits — type(scope): sujet
// types: feat, fix, chore, docs, refactor, test, ci, perf, build, style, revert
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
