import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isAdmin } from '@/lib/adminAuth';
import { sendPush } from '@/lib/push';

export const dynamic = 'force-dynamic';
const deny = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

/** POST { subscription } -> registra este dispositivo | POST { test: true } -> envía una notificación de prueba */
export async function POST(req: Request) {
  if (!(await isAdmin())) return deny();
  const b = await req.json().catch(() => ({}));

  if (b.test) {
    await sendPush({ title: '🔔 Notificaciones activadas', body: 'Así te va a llegar cada turno nuevo.', url: '/admin' });
    return NextResponse.json({ ok: true });
  }

  const s = b.subscription;
  if (typeof s?.endpoint !== 'string' || !s.endpoint.startsWith('https://') || typeof s?.keys?.p256dh !== 'string' || typeof s?.keys?.auth !== 'string')
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });

  const { error } = await db().from('push_subscriptions').upsert(
    { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, user_agent: (req.headers.get('user-agent') ?? '').slice(0, 200) },
    { onConflict: 'endpoint' },
  );
  if (error) {
    console.error('[push subscribe]', error);
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE { endpoint } -> da de baja este dispositivo */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return deny();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint === 'string') await db().from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
