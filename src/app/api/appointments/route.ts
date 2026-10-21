import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { expireStale, getSlots, loadConfig } from '@/lib/availability';
import { isDate, isTime } from '@/lib/dates';
import { createPreference } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

const HOLD_MINUTES = 15; // tiempo que se reserva el horario mientras la persona paga

/** POST /api/appointments -> crea el turno en "pending" y devuelve el link de pago de Mercado Pago. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const petName = String(b?.petName ?? '').trim();
  const ownerName = String(b?.ownerName ?? '').trim();
  const phone = String(b?.phone ?? '').replace(/[^\d+]/g, '');
  const service = String(b?.service ?? '').trim();
  const { date, time } = b ?? {};

  if (petName.length < 1 || petName.length > 60 || ownerName.length < 2 || ownerName.length > 80)
    return NextResponse.json({ error: 'Completá el nombre de la mascota y el tuyo.' }, { status: 400 });
  if (phone.replace(/\D/g, '').length < 8 || phone.length > 20)
    return NextResponse.json({ error: 'Ingresá un teléfono válido.' }, { status: 400 });
  if (!isDate(date) || !isTime(time))
    return NextResponse.json({ error: 'Elegí día y horario.' }, { status: 400 });

  try {
    await expireStale();
    const config = await loadConfig();
    const slot = (await getSlots(date, date, config)).result[date]?.find((s) => s.time === time);
    if (!slot?.free) return NextResponse.json({ error: 'Ese horario ya no está disponible. Elegí otro.' }, { status: 409 });

    const { count } = await db().from('appointments').select('id', { count: 'exact', head: true })
      .eq('phone', phone).eq('status', 'pending');
    if ((count ?? 0) >= 3) return NextResponse.json({ error: 'Tenés varios turnos sin pagar. Esperá unos minutos.' }, { status: 429 });

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const { data: appt, error } = await db().from('appointments').insert({
      pet_name: petName, owner_name: ownerName, phone, service: service || null,
      appt_date: date, appt_time: time, deposit_amount: config.deposit_amount,
      status: 'pending', expires_at: expiresAt.toISOString(),
    }).select('id').single();

    if (error?.code === '23505') return NextResponse.json({ error: 'Ese horario acaba de ser tomado. Elegí otro.' }, { status: 409 });
    if (error || !appt) throw error ?? new Error('insert falló');

    try {
      const pref = await createPreference({ appointmentId: appt.id, amount: config.deposit_amount, expiresAt });
      await db().from('appointments').update({ mp_preference_id: pref.id }).eq('id', appt.id);
      return NextResponse.json({ url: pref.init_point });
    } catch (e) {
      console.error(e);
      await db().from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
      return NextResponse.json({ error: 'No pudimos iniciar el pago. Probá de nuevo.' }, { status: 502 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error inesperado. Probá de nuevo.' }, { status: 500 });
  }
}
