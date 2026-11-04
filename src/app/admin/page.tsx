'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallButton from '@/components/InstallButton';
import PushToggle from '@/components/PushToggle';

type Appt = { id: string; pet_name: string; owner_name: string; phone: string; service: string | null; appt_date: string; appt_time: string; status: string };
type Blocked = { day: string; reason: string | null };

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const STATUS: Record<string, string> = { confirmed: 'Confirmado', pending: 'Esperando pago', refund_pending: 'Devolver seña' };
const input = 'rounded-xl border-2 border-ink/10 bg-white px-3 py-2';

const fmt = (d: string) => d.split('-').reverse().join('/');
const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const addDay = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
function dayTitle(date: string, today: string) {
  if (date === today) return `Hoy · ${fmt(date)}`;
  if (date === addDay(today, 1)) return `Mañana · ${fmt(date)}`;
  const t = new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Admin() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [appts, setAppts] = useState<Appt[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [day, setDay] = useState('');
  const [ym, setYm] = useState(() => todayAR().slice(0, 7));
  const [sel, setSel] = useState<string | null>(null); // día elegido en el calendario (null = ver todos)

  const today = todayAR();

  const load = useCallback(async () => {
    const r = await fetch('/api/admin');
    if (r.status === 401) { setAuth(false); return false; }
    const d = await r.json();
    setAppts(d.appointments); setBlocked(d.blocked); setAuth(true);
    return true;
  }, []);
  useEffect(() => { load(); }, [load]);
  // Al volver a la app (por ejemplo tocando una notificación) se refrescan los turnos.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const act = async (body: object) => {
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  };
  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
    if (!r.ok) return setErr('Clave incorrecta');
    if (!(await load())) setErr('La clave es correcta pero el navegador no guardó la sesión. Si entrás por http://IP de tu red local, probá con localhost o con https.');
  }

  const byDate = useMemo(() => {
    const m: Record<string, Appt[]> = {};
    for (const a of appts) (m[a.appt_date] ??= []).push(a);
    return m;
  }, [appts]);
  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.day)), [blocked]);

  if (auth === null) return <main className="p-8">Cargando…</main>;
  if (!auth) return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="font-display text-3xl font-extrabold">Panel de turnos</h1>
      <form onSubmit={login} className="mt-6 space-y-3">
        <input type="password" autoFocus value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Clave" className={`${input} w-full`} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full rounded-xl bg-aqua py-3 font-display text-lg font-semibold text-white">Entrar</button>
      </form>
    </main>
  );

  // ----- calendario -----
  const [y, m] = ym.split('-').map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // semana desde el lunes
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const dates = sel ? [sel] : Object.keys(byDate).sort();

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Turnos</h1>
        <button onClick={async () => { await fetch('/api/admin/login', { method: 'DELETE' }); setAuth(false); }} className="text-sm underline">Salir</button>
      </div>
      <InstallButton label="Instalar app de turnos" className="rounded-xl bg-aqua px-4 py-2.5 font-semibold text-white transition hover:bg-aqua-dark" />
      <PushToggle />

      <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} disabled={ym <= today.slice(0, 7)} aria-label="Mes anterior"
            className="h-10 w-10 rounded-full bg-foam text-lg disabled:opacity-30">‹</button>
          <h2 className="font-display text-xl font-semibold">{MESES[m - 1]} {y}</h2>
          <button type="button" onClick={() => shift(1)} aria-label="Mes siguiente" className="h-10 w-10 rounded-full bg-foam text-lg">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
          {DIAS.map((d, i) => <div key={i} className="pb-1 font-semibold text-ink/50">{d}</div>)}
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: total }).map((_, i) => {
            const n = i + 1;
            const date = `${ym}-${String(n).padStart(2, '0')}`;
            const list = byDate[date] ?? [];
            const isBlocked = blockedSet.has(date);
            const refund = list.some((a) => a.status === 'refund_pending');
            const k = list.length;
            // 1-2 turnos: turquesa | 3-4: amarillo | 5 o más: rojo
            const cls = isBlocked ? 'bg-ink/15 text-ink/40 line-through'
              : k >= 5 ? 'bg-red-200 text-ink hover:bg-red-300'
                : k >= 3 ? 'bg-yellow-200 text-ink hover:bg-yellow-300'
                  : k >= 1 ? 'bg-aqua/20 text-ink hover:bg-aqua/30'
                    : date < today ? 'text-ink/25' : 'bg-foam text-ink/70 hover:bg-aqua/10';
            const badge = k >= 5 ? 'bg-red-600' : k >= 3 ? 'bg-yellow-700' : 'bg-aqua-dark';
            return (
              <button key={date} type="button" onClick={() => setSel(sel === date ? null : date)}
                aria-label={`${n} de ${MESES[m - 1]}: ${isBlocked ? 'cerrado' : `${list.length} turnos`}`}
                className={`flex h-14 flex-col items-center justify-center rounded-xl font-semibold transition sm:h-16 ${cls} ${date === today ? 'border-2 border-ink' : ''} ${sel === date ? 'ring-4 ring-sun ring-offset-2 ring-offset-white' : ''}`}>
                <span className="h-4 text-[10px] font-bold leading-4">{date === today ? 'Hoy' : ''}</span>
                <span className="leading-5">{n}</span>
                <span className="h-4">
                  {k > 0 && <span className={`inline-block rounded-full px-1.5 text-[11px] leading-4 text-white ${badge}`}>{k}{refund ? '!' : ''}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">{sel ? dayTitle(sel, today) : 'Próximos turnos'}</h2>
          {sel && (
            <div className="flex gap-2 text-sm">
              <button onClick={() => act({ action: blockedSet.has(sel) ? 'unblock' : 'block', date: sel })} className="rounded-lg border-2 border-ink/15 px-3 py-1.5 font-semibold">
                {blockedSet.has(sel) ? 'Reabrir este día' : 'Cerrar este día'}
              </button>
              <button onClick={() => setSel(null)} className="rounded-lg px-3 py-1.5 underline">Ver todos</button>
            </div>
          )}
        </div>

        {dates.length === 0 && <p className="text-ink/60">Todavía no hay turnos cargados.</p>}
        {sel && !byDate[sel] && <p className="text-ink/60">{blockedSet.has(sel) ? 'Día cerrado.' : 'No hay turnos este día.'}</p>}

        {dates.filter((d) => byDate[d]).map((d) => (
          <div key={d} className="space-y-2">
            {!sel && <h3 className="font-display text-lg font-semibold text-ink/70">{dayTitle(d, today)}</h3>}
            {byDate[d].map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <p className="font-display text-lg font-semibold">{a.appt_time.slice(0, 5)} — {a.pet_name}</p>
                  <p className="text-sm text-ink/70">{a.owner_name} · <a className="underline" href={`https://wa.me/${a.phone.replace(/\D/g, '')}`}>{a.phone}</a>{a.service ? ` · ${a.service}` : ''}</p>
                  <p className={`text-sm font-semibold ${a.status === 'confirmed' ? 'text-green-700' : 'text-amber-700'}`}>{STATUS[a.status] ?? a.status}</p>
                </div>
                <button onClick={() => confirm(`¿Cancelar el turno de ${a.pet_name}?`) && act({ action: 'cancel', id: a.id })}
                  className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700">Cancelar</button>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Días cerrados</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (day) { act({ action: 'block', date: day }); setDay(''); } }} className="flex gap-2">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={input} />
          <button className="rounded-xl bg-ink px-4 py-2 font-semibold text-white">Cerrar día</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {blocked.map((b) => (
            <button key={b.day} onClick={() => act({ action: 'unblock', date: b.day })} title="Tocar para reabrir"
              className="rounded-full bg-ink/10 px-3 py-1 text-sm font-semibold text-ink/70">{fmt(b.day)} ✕</button>
          ))}
        </div>
      </section>
    </main>
  );
}