// Live contract suite: real API, real sms_dev data. Not part of `npm test`.
const base = require('../../jest.config');

module.exports = {
  ...base,
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/scripts/contract-check/**/*.contract.ts'],
  testTimeout: 120000,
};
