import { NextResponse } from 'next/server';
import { expireStale, getSlots, loadConfig } from '@/lib/availability';
import { isDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/** GET /api/slots?date=YYYY-MM-DD  ->  { slots: [{ time, free }] } */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date');
  if (!isDate(date)) return NextResponse.json({ error: 'date inválida' }, { status: 400 });
  try {
    await expireStale();
    const { result } = await getSlots(date, date, await loadConfig());
    return NextResponse.json({ slots: result[date] ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'No se pudieron cargar los horarios' }, { status: 500 });
  }
}
