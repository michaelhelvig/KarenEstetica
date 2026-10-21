import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isAdmin } from '@/lib/adminAuth';
import { isDate, nowAR } from '@/lib/dates';

export const dynamic = 'force-dynamic';
const deny = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

export async function GET() {
  if (!(await isAdmin())) return deny();
  const today = nowAR().date;
  const [appts, blocked] = await Promise.all([
    db().from('appointments').select('id,pet_name,owner_name,phone,service,appt_date,appt_time,status,deposit_amount')
      .gte('appt_date', today).in('status', ['confirmed', 'pending', 'refund_pending'])
      .order('appt_date').order('appt_time'),
    db().from('blocked_days').select('day,reason').gte('day', today).order('day'),
  ]);
  return NextResponse.json({ appointments: appts.data ?? [], blocked: blocked.data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return deny();
  const b = await req.json().catch(() => ({}));
  if (b.action === 'cancel' && typeof b.id === 'string') {
    await db().from('appointments').update({ status: 'cancelled' }).eq('id', b.id);
  } else if (b.action === 'block' && isDate(b.date)) {
    await db().from('blocked_days').upsert({ day: b.date, reason: String(b.reason ?? '').slice(0, 100) || null });
  } else if (b.action === 'unblock' && isDate(b.date)) {
    await db().from('blocked_days').delete().eq('day', b.date);
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
