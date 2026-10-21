'use client';
import { useCallback, useEffect, useState } from 'react';

type Appt = { id: string; pet_name: string; owner_name: string; phone: string; service: string | null; appt_date: string; appt_time: string; status: string };
type Blocked = { day: string; reason: string | null };
const fmt = (d: string) => d.split('-').reverse().join('/');
const STATUS: Record<string, string> = { confirmed: 'Confirmado', pending: 'Esperando pago', refund_pending: 'Devolver seña' };
const input = 'rounded-xl border-2 border-ink/10 bg-white px-3 py-2';

export default function Admin() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [appts, setAppts] = useState<Appt[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [day, setDay] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin');
    if (r.status === 401) return setAuth(false);
    const d = await r.json();
    setAppts(d.appointments); setBlocked(d.blocked); setAuth(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body: object) => {
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  };
  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
    r.ok ? load() : setErr('Clave incorrecta');
  }

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

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Próximos turnos</h1>
        <button onClick={async () => { await fetch('/api/admin/login', { method: 'DELETE' }); setAuth(false); }} className="text-sm underline">Salir</button>
      </div>

      <section className="space-y-2">
        {appts.length === 0 && <p className="text-ink/60">Todavía no hay turnos cargados.</p>}
        {appts.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-display text-lg font-semibold">{fmt(a.appt_date)} · {a.appt_time.slice(0, 5)} — {a.pet_name}</p>
              <p className="text-sm text-ink/70">{a.owner_name} · <a className="underline" href={`https://wa.me/${a.phone.replace(/\D/g, '')}`}>{a.phone}</a>{a.service ? ` · ${a.service}` : ''}</p>
              <p className={`text-sm font-semibold ${a.status === 'confirmed' ? 'text-green-700' : 'text-amber-700'}`}>{STATUS[a.status] ?? a.status}</p>
            </div>
            <button onClick={() => confirm(`¿Cancelar el turno de ${a.pet_name}?`) && act({ action: 'cancel', id: a.id })}
              className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700">Cancelar</button>
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
              className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">{fmt(b.day)} ✕</button>
          ))}
        </div>
      </section>
    </main>
  );
}
