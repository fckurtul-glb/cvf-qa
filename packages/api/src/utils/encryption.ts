import crypto from 'crypto';
import { config } from '../config/env';

const KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
}

export function decrypt(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const argon2 = await import('argon2');
  return argon2.hash(password, { type: 2 /* argon2id */, memoryCost: 65536, timeCost: 3, parallelism: 4 });
}
