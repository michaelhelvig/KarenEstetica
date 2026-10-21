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
  res.cookies.set(COOKIE, adminToken(), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
