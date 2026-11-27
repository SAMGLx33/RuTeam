import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
  VERIFICATION_PROVIDER: z.enum(['demo', 'official']).default('official'),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  EXPO_PUSH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  EXPO_PUSH_ACCESS_TOKEN: z.string().min(20).optional(),
  RECURRING_TRIP_HORIZON_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(28)
    .default(7),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(3600),
  AUTH_TOKEN_SECRET: z.string().min(32).optional(),
  AUTH_PUBLIC_URL: z.url().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.email().optional(),
  CORS_ORIGINS: z.string().min(1),
  ROUTING_BASE_URL: z
    .url()
    .regex(/^https?:\/\//)
    .optional(),
  GEOCODING_BASE_URL: z
    .url()
    .regex(/^https?:\/\//)
    .optional(),
  ROUTING_SELECTION_SECRET: z.string().min(32).optional(),
});
export function readEnvironment() {
  const parsed = schema.parse(process.env);
  if (parsed.DEMO_MODE === 'true' && parsed.NODE_ENV === 'production')
    throw new Error('DEMO_MODE prohibido en producción');
  if (parsed.DEMO_MODE === 'false' && parsed.VERIFICATION_PROVIDER === 'demo') {
    // Sin login demo ni verificación sintética: el provider oficial falla cerrado.
    parsed.VERIFICATION_PROVIDER = 'official';
  }
  if ((parsed.SMTP_USER === undefined) !== (parsed.SMTP_PASSWORD === undefined))
    throw new Error('SMTP_USER y SMTP_PASSWORD se configuran juntos');
  if (
    parsed.SMTP_HOST &&
    !parsed.SMTP_SECURE &&
    (parsed.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1', '::1'].includes(parsed.SMTP_HOST))
  )
    throw new Error('SMTP sin TLS sólo se permite en loopback no productivo');
  if (parsed.AUTH_PUBLIC_URL) {
    const link = new URL(parsed.AUTH_PUBLIC_URL);
    if (
      !['https:', 'http:'].includes(link.protocol) ||
      (parsed.NODE_ENV === 'production' && link.protocol !== 'https:') ||
      link.username ||
      link.password ||
      link.search ||
      link.hash
    )
      throw new Error(
        'AUTH_PUBLIC_URL debe ser una URL pública HTTP(S) segura',
      );
  }
  for (const key of ['ROUTING_BASE_URL', 'GEOCODING_BASE_URL'] as const) {
    const value = parsed[key];
    if (!value) continue;
    const provider = new URL(value);
    if (
      provider.username ||
      provider.password ||
      provider.search ||
      provider.hash
    )
      throw new Error(
        `${key} debe ser una URL HTTP(S) base sin credenciales, query ni fragmento`,
      );
  }
  const origins = parsed.CORS_ORIGINS.split(',').map(
    (origin) => new URL(origin.trim()).origin,
  );
  return { ...parsed, demo: parsed.DEMO_MODE === 'true', origins };
}
export type Environment = ReturnType<typeof readEnvironment>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');
