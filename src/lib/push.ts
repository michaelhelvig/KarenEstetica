import * as webpush from 'web-push';
import { db } from './supabase';

let ready = false;
function setup() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', pub, priv);
  ready = true;
  return true;
}

/**
 * Envía una notificación push a todos los dispositivos registrados (la app "Karen Turnos" de la dueña).
 * Nunca lanza error: si falla sólo lo registra, para no romper la confirmación del turno.
 */
export async function sendPush(payload: { title: string; body: string; url?: string }) {
  try {
    if (!setup()) return console.warn('[push] faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
    const { data } = await db().from('push_subscriptions').select('id,endpoint,p256dh,auth');
    if (!data?.length) return;
    const body = JSON.stringify(payload);
    await Promise.all(data.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: 'high' });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db().from('push_subscriptions').delete().eq('id', s.id); // dispositivo dado de baja
        else console.error('[push]', code ?? e);
      }
    }));
  } catch (e) {
    console.error('[push]', e);
  }
}
