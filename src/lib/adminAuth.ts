import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'kec_admin';

export function adminToken() {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) throw new Error('Falta ADMIN_PASSWORD');
  return createHmac('sha256', pwd).update('karen-estetica-admin').digest('hex');
}

export async function isAdmin() {
  try {
    const c = (await cookies()).get(COOKIE)?.value;
    if (!c) return false;
    const a = Buffer.from(c), b = Buffer.from(adminToken());
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
