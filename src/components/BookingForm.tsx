'use client';
import { useEffect, useState } from 'react';
import Calendar from './Calendar';

type Slot = { time: string; free: boolean };
const input = 'w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-base placeholder:text-ink/35 focus:border-aqua focus:outline-none';
const label = 'mb-1 block text-sm font-semibold';

export default function BookingForm({ today, deposit, services }: { today: string; deposit: number; services: string[] }) {
  const [petName, setPetName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState(services[0] ?? '');
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date) return;
    let alive = true;
    setSlots(null); setTime(null);
    fetch(`/api/slots?date=${date}`).then((r) => r.json()).then((d) => alive && setSlots(d.slots ?? [])).catch(() => alive && setSlots([]));
    return () => { alive = false; };
  }, [date]);

  const money = deposit.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const nice = date ? date.split('-').reverse().join('/') : '';

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!date || !time) return setError('Elegí un día y un horario.');
    setBusy(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petName, ownerName, phone, service, date, time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No pudimos reservar el turno.');
        if (res.status === 409) { // refrescar horarios
          const d = date; setDate(null); setTimeout(() => setDate(d), 0);
        }
        return setBusy(false);
      }
      window.location.href = data.url;
    } catch {
      setError('Sin conexión. Probá de nuevo.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">¿Quién viene a la peluquería?</h2>
        <div>
          <label className={label} htmlFor="pet">Nombre de la mascota</label>
          <input id="pet" required maxLength={60} value={petName} onChange={(e) => setPetName(e.target.value)} className={input} placeholder="Ej: Luna" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="owner">Tu nombre</label>
            <input id="owner" required maxLength={80} autoComplete="name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="phone">Tu WhatsApp</label>
            <input id="phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="11 2345 6789" />
          </div>
        </div>
        {services.length > 0 && (
          <div>
            <label className={label} htmlFor="svc">Servicio</label>
            <select id="svc" value={service} onChange={(e) => setService(e.target.value)} className={input}>
              {services.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Elegí el día</h2>
        <Calendar today={today} value={date} onChange={setDate} />
      </section>

      {date && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Horarios del {nice}</h2>
          {slots === null && <p className="text-ink/60">Buscando horarios…</p>}
          {slots && slots.length === 0 && <p className="text-ink/60">No quedan horarios para este día.</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots?.map((s) => (
              <button key={s.time} type="button" disabled={!s.free} onClick={() => setTime(s.time)}
                className={`rounded-xl border-2 py-2.5 font-semibold transition ${
                  time === s.time ? 'border-aqua bg-aqua text-white'
                  : s.free ? 'border-aqua/30 bg-white hover:border-aqua'
                  : 'border-transparent bg-ink/5 text-ink/30 line-through'}`}>
                {s.time}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-ink p-5 text-white">
        <p className="text-sm text-white/70">
          {date && time ? <>Turno para <b className="text-white">{petName || 'tu mascota'}</b> el <b className="text-white">{nice}</b> a las <b className="text-white">{time}</b>.</> : 'Elegí día y horario para continuar.'}
        </p>
        <p className="mt-1 text-sm text-white/70">Para confirmarlo abonás una seña de <b className="text-white">{money}</b> por Mercado Pago. El horario queda reservado 15 minutos mientras pagás.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>}
        <button type="submit" disabled={busy || !date || !time}
          className="mt-4 w-full rounded-xl bg-sun py-3.5 font-display text-lg font-semibold text-ink transition hover:bg-sun-dark disabled:opacity-50">
          {busy ? 'Abriendo Mercado Pago…' : `Pagar seña de ${money}`}
        </button>
      </section>
    </form>
  );
}
