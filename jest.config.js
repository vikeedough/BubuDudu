/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.svg$": "<rootDir>/tests/mocks/svgMock.ts",
  },
  collectCoverageFrom: [
    "utils/**/*.ts",
    "stores/**/*.ts",
    "api/endpoints/**/*.ts",
    "hooks/**/*.ts",
  ],
};
