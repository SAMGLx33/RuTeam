import fixtures from '../../scripts/test-fixtures.json' with { type: 'json' };

process.env.NODE_ENV = 'test';
process.env.AUTH_FIXTURE_PASSWORD ??= fixtures.defaultAuthFixturePassword;
