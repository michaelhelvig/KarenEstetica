import { NextResponse } from 'next/server';
import { COOKIE, adminToken } from '@/lib/adminAuth';
import { timingSafeEqual } from 'crypto';

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const real = process.env.ADMIN_PASSWORD ?? '';
  const a = Buffer.from(String(password ?? '')), b = Buffer.from(real);
  if (!real || a.length !== b.length || !timingSafeEqual(a, b))
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  // La cookie "secure" sólo se guarda en https (Safari la descarta en http, p. ej. al entrar por la IP de la red local).
  const https = req.headers.get('x-forwarded-proto') === 'https' || new URL(req.url).protocol === 'https:';
  res.cookies.set(COOKIE, adminToken(), {
    httpOnly: true, sameSite: 'lax', secure: https, path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}