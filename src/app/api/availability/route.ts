import { NextResponse } from 'next/server';
import { expireStale, getSlots, loadConfig } from '@/lib/availability';

export const dynamic = 'force-dynamic';

/** GET /api/availability?month=YYYY-MM  ->  { days: { 'YYYY-MM-DD': cantidadLibres }, today, maxDate } */
export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get('month') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'month inválido' }, { status: 400 });
  try {
    await expireStale();
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const { result, today, maxDate } = await getSlots(`${month}-01`, `${month}-${String(last).padStart(2, '0')}`, await loadConfig());
    const days: Record<string, number> = {};
    for (const [d, slots] of Object.entries(result)) days[d] = slots.filter((s) => s.free).length;
    return NextResponse.json({ days, today, maxDate });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'No se pudo cargar la disponibilidad' }, { status: 500 });
  }
}
