/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  testMatch: [
    "<rootDir>/test/**/*.[jt]s?(x)",
  ],
  testPathIgnorePatterns: ["<rootDir>/_build/", "<rootDir>/node_modules/"]
};
