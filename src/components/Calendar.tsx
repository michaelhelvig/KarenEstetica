'use client';
import { useEffect, useState } from 'react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Info = { days: Record<string, number>; today: string; maxDate: string };

export default function Calendar({ today, value, onChange }: { today: string; value: string | null; onChange: (d: string) => void }) {
  const [ym, setYm] = useState(today.slice(0, 7));
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setInfo(null); setError(false);
    fetch(`/api/availability?month=${ym}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setInfo(d))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [ym]);

  const [y, m] = ym.split('-').map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // semana arranca el lunes
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const canPrev = ym > today.slice(0, 7);
  const canNext = !!info && ym < info.maxDate.slice(0, 7);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mes anterior"
          className="h-10 w-10 rounded-full bg-white text-lg shadow-sm disabled:opacity-30">‹</button>
        <h3 className="font-display text-xl font-semibold">{MESES[m - 1]} {y}</h3>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Mes siguiente"
          className="h-10 w-10 rounded-full bg-white text-lg shadow-sm disabled:opacity-30">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
        {DIAS.map((d, i) => <div key={i} className="pb-1 font-semibold text-ink/50">{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const date = `${ym}-${String(day).padStart(2, '0')}`;
          const free = info?.days[date];
          const out = !info || free === undefined; // pasado, fuera de rango o cargando
          const available = !out && free! > 0;
          const selected = value === date;
          const cls = out
            ? 'bg-ink/5 text-ink/30'
            : available
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-red-500/90 text-white';
          return (
            <button key={date} type="button" disabled={!available} onClick={() => onChange(date)}
              aria-label={`${day} de ${MESES[m - 1]}: ${out ? 'no disponible' : available ? 'con turnos' : 'sin turnos'}`}
              className={`aspect-square rounded-xl font-semibold transition ${cls} ${selected ? 'ring-4 ring-sun ring-offset-2 ring-offset-white' : ''} ${!available ? 'cursor-not-allowed' : ''}`}>
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-green-500" /> Hay turnos</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-red-500/90" /> Sin turnos</span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">No pudimos cargar el calendario. Recargá la página.</p>}
    </div>
  );
}
