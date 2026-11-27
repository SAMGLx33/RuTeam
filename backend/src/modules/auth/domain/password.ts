import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// N*r*128 = 32 MiB; bound memory and parameters independently of stored input.
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128)
    throw new Error(
      'La contraseña de RuTeam debe tener entre 12 y 128 caracteres',
    );
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt.toString('hex')}$${key.toString('hex')}`;
}
export async function verifyPassword(
  password: string,
  encoded: string | null,
): Promise<boolean> {
  const match = encoded?.match(
    /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/,
  );
  // Unknown accounts perform the same expensive derivation; no fast enumeration path.
  const salt = Buffer.from(match?.[1] ?? '00'.repeat(16), 'hex');
  const expected = Buffer.from(match?.[2] ?? '00'.repeat(64), 'hex');
  const actual = await derive(password.length <= 128 ? password : '', salt);
  return !!match && password.length <= 128 && timingSafeEqual(actual, expected);
}
