module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    // Backend uses explicit `any` in a couple of isolated edge-cases (e.g. external SDK types).
    "@typescript-eslint/no-explicit-any": "off",
    // Express middleware commonly includes `next` but may not use it; underscore indicates intentionally unused.
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" },
    ],
  },
};

