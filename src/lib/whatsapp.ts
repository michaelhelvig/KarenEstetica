import { formatDateAR, nowAR } from './dates';
import { sendPush } from './push';

/**
 * Notificación por WhatsApp a la dueña. Nunca lanza error: si falla, sólo lo registra,
 * para no romper la confirmación del turno.
 */
export async function notifyOwner(text: string, params?: string[]) {
  const to = process.env.OWNER_WHATSAPP;
  if (!to) return console.warn('[whatsapp] OWNER_WHATSAPP no configurado');
  try {
    if ((process.env.WHATSAPP_PROVIDER ?? 'callmebot') === 'cloud') {
      const body = process.env.WHATSAPP_TEMPLATE && params
        ? {
          messaging_product: 'whatsapp', to, type: 'template',
          template: {
            name: process.env.WHATSAPP_TEMPLATE, language: { code: 'es_AR' },
            components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: p })) }],
          },
        }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
      const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_CLOUD_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) console.error('[whatsapp cloud]', res.status, await res.text());
    } else {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent('+' + to.replace(/\D/g, ''))}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_APIKEY ?? '')}`;
      const res = await fetch(url);
      if (!res.ok) console.error('[whatsapp callmebot]', res.status, await res.text());
    }
  } catch (e) {
    console.error('[whatsapp]', e);
  }
}

type NewAppt = { pet_name: string; owner_name: string; phone: string; service: string | null; appt_date: string; appt_time: string; deposit_amount: number | string };

/** Avisa a la dueña de un turno nuevo confirmado. */
export async function notifyNewAppointment(a: NewAppt, paid: boolean) {
  const date = formatDateAR(a.appt_date);
  const time = String(a.appt_time).slice(0, 5);
  const seña = paid ? `\nSeña: $${Number(a.deposit_amount).toLocaleString('es-AR')}` : '\n(sin seña - modo prueba)';
  await Promise.allSettled([
    sendPush({ title: `🐶 Nuevo turno: ${a.pet_name}`, body: `${a.appt_date === nowAR().date ? `Hoy (${date} ${time})` : `${date} ${time}`} · ${a.owner_name}${a.service ? ` · ${a.service}` : ''}`, url: '/admin' }),
    notifyOwner(
      `🐶 Nuevo turno confirmado\nMascota: ${a.pet_name}\nDueño/a: ${a.owner_name}\nTel: ${a.phone}\nServicio: ${a.service ?? '-'}\nFecha: ${date}\nHora: ${time}${seña}`,
      [a.pet_name, a.owner_name, a.phone, date, time],
    ),
  ]);
}