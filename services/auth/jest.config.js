module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
