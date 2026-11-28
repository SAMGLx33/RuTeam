import fixtures from '../../scripts/test-fixtures.json' with { type: 'json' };

process.env.NODE_ENV = 'test';
process.env.INSTITUTIONAL_ACCESS_MODE = 'OFFICIAL';
process.env.AUTH_FIXTURE_PASSWORD ??= fixtures.defaultAuthFixturePassword;
