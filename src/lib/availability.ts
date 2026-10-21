import { db } from './supabase';
import { addDays, fromMin, nowAR, toMin, weekdayOf } from './dates';

export type Config = {
  slot_minutes: number;
  deposit_amount: number;
  max_days_ahead: number;
  min_notice_minutes: number;
};
export type Slot = { time: string; free: boolean };

export async function loadConfig(): Promise<Config> {
  const { data, error } = await db().from('settings').select('*').eq('id', 1).single();
  if (error || !data) throw new Error('No se pudo leer la configuración (¿ejecutaste schema.sql?)');
  return { ...data, deposit_amount: Number(data.deposit_amount) };
}

/** Libera los turnos "pending" cuyo plazo de pago venció. */
export async function expireStale() {
  await db().from('appointments').update({ status: 'expired' })
    .eq('status', 'pending').lt('expires_at', new Date().toISOString());
}

/**
 * Devuelve, por fecha, la grilla de horarios con su disponibilidad.
 * Las fechas fuera de la ventana reservable (pasadas o muy lejanas) no aparecen en el resultado.
 */
export async function getSlots(from: string, to: string, config: Config) {
  const now = nowAR();
  const maxDate = addDays(now.date, config.max_days_ahead);
  const start = from < now.date ? now.date : from;
  const end = to > maxDate ? maxDate : to;
  const result: Record<string, Slot[]> = {};
  if (start > end) return { result, today: now.date, maxDate };

  const [sched, blocked, taken] = await Promise.all([
    db().from('schedule').select('weekday,start_time,end_time'),
    db().from('blocked_days').select('day').gte('day', start).lte('day', end),
    db().from('appointments').select('appt_date,appt_time')
      .in('status', ['pending', 'confirmed']).gte('appt_date', start).lte('appt_date', end),
  ]);
  if (sched.error || blocked.error || taken.error) throw new Error('Error leyendo disponibilidad');

  const blockedSet = new Set((blocked.data ?? []).map((b) => b.day as string));
  const takenSet = new Set((taken.data ?? []).map((t) => `${t.appt_date}|${String(t.appt_time).slice(0, 5)}`));

  for (let d = start; d <= end; d = addDays(d, 1)) {
    const slots: Slot[] = [];
    if (!blockedSet.has(d)) {
      const ranges = (sched.data ?? []).filter((r) => r.weekday === weekdayOf(d));
      for (const r of ranges) {
        for (let t = toMin(r.start_time); t + config.slot_minutes <= toMin(r.end_time); t += config.slot_minutes) {
          const time = fromMin(t);
          const tooSoon = d === now.date && t < now.minutes + config.min_notice_minutes;
          slots.push({ time, free: !tooSoon && !takenSet.has(`${d}|${time}`) });
        }
      }
      slots.sort((a, b) => a.time.localeCompare(b.time));
    }
    result[d] = slots;
  }
  return { result, today: now.date, maxDate };
}
