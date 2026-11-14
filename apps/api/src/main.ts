import { createApp } from './bootstrap.js';
import { ENVIRONMENT, type Environment } from './config/environment.js';
const app = await createApp();
const env = app.get<Environment>(ENVIRONMENT);
await app.listen(env.PORT, '0.0.0.0');
console.log(`RuTeam API http://localhost:${env.PORT}/api/v1; DEMO=${env.demo}`);
