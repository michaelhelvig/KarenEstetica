const TZ = 'America/Argentina/Buenos_Aires';

/** Fecha (YYYY-MM-DD) y minutos del día actuales en horario de Argentina. */
export function nowAR() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: parseInt(g('hour')) * 60 + parseInt(g('minute')) };
}

export const toMin = (t: string) => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const weekdayOf = (date: string) => new Date(date + 'T00:00:00Z').getUTCDay();
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s: unknown): s is string => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);

export function addDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const formatDateAR = (date: string) => date.split('-').reverse().join('/');
