import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getPayment } from '@/lib/mercadopago';
import { notifyOwner } from '@/lib/whatsapp';
import { formatDateAR } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * Webhook de Mercado Pago. No confiamos en el cuerpo: sólo tomamos el id del pago
 * y lo consultamos a la API de MP con nuestro token.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body?.type;
  const paymentId = url.searchParams.get('data.id') ?? body?.data?.id ?? (type === 'payment' ? url.searchParams.get('id') : null);
  if (type !== 'payment' || !paymentId) return NextResponse.json({ ok: true });

  try {
    const payment = await getPayment(String(paymentId));
    const ref = payment.external_reference;
    if (payment.status !== 'approved' || !ref) return NextResponse.json({ ok: true });

    // Confirma sólo si todavía no estaba confirmado (idempotente: MP puede reenviar el aviso).
    const { data: appt, error } = await db().from('appointments')
      .update({ status: 'confirmed', mp_payment_id: String(paymentId), paid_at: new Date().toISOString() })
      .eq('id', ref).in('status', ['pending', 'expired'])
      .select('*').maybeSingle();

    if (error?.code === '23505') {
      // Pagó después de vencer el plazo y otra persona ya tomó el horario.
      const { data: a } = await db().from('appointments')
        .update({ status: 'refund_pending', mp_payment_id: String(paymentId) }).eq('id', ref).select('*').maybeSingle();
      if (a) await notifyOwner(`⚠️ Pago recibido pero el horario ${formatDateAR(a.appt_date)} ${String(a.appt_time).slice(0, 5)} ya estaba ocupado. Hay que devolver la seña de ${a.owner_name} (${a.phone}). Pago MP #${paymentId}.`);
      return NextResponse.json({ ok: true });
    }
    if (error) throw error;

    if (appt) {
      const date = formatDateAR(appt.appt_date);
      const time = String(appt.appt_time).slice(0, 5);
      await notifyOwner(
        `🐶 Nuevo turno confirmado\nMascota: ${appt.pet_name}\nDueño/a: ${appt.owner_name}\nTel: ${appt.phone}\nServicio: ${appt.service ?? '-'}\nFecha: ${date}\nHora: ${time}\nSeña: $${Number(appt.deposit_amount).toLocaleString('es-AR')}`,
        [appt.pet_name, appt.owner_name, appt.phone, date, time],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[mp webhook]', e);
    return NextResponse.json({ error: 'retry' }, { status: 500 }); // MP reintenta
  }
}
