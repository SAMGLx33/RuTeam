import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
  VERIFICATION_PROVIDER: z.enum(['demo', 'official']).default('official'),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(3600),
  CORS_ORIGINS: z.string().min(1),
  ROUTING_BASE_URL: z
    .url()
    .regex(/^https?:\/\//)
    .optional(),
});
export function readEnvironment() {
  const parsed = schema.parse(process.env);
  if (parsed.DEMO_MODE === 'true' && parsed.NODE_ENV === 'production')
    throw new Error('DEMO_MODE prohibido en producción');
  if (parsed.DEMO_MODE === 'false' && parsed.VERIFICATION_PROVIDER === 'demo') {
    // Sin login demo ni verificación sintética: el provider oficial falla cerrado.
    parsed.VERIFICATION_PROVIDER = 'official';
  }
  if (parsed.ROUTING_BASE_URL) {
    const routing = new URL(parsed.ROUTING_BASE_URL);
    if (routing.username || routing.password || routing.search || routing.hash)
      throw new Error(
        'ROUTING_BASE_URL debe ser una URL HTTP(S) base sin credenciales, query ni fragmento',
      );
  }
  const origins = parsed.CORS_ORIGINS.split(',').map(
    (origin) => new URL(origin.trim()).origin,
  );
  return { ...parsed, demo: parsed.DEMO_MODE === 'true', origins };
}
export type Environment = ReturnType<typeof readEnvironment>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');
