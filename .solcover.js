module.exports = {
  skipFiles: ['openzeppelin/utils/Context.sol', 'testContracts/'],
  istanbulFolder: 'reports',
  istanbulReporter: ['text', 'json-summary', 'cobertura', 'lcov'],
  limits: {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100
  },
};