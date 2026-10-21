import Link from 'next/link';
import { db } from '@/lib/supabase';
import { formatDateAR } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function Resultado({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ref = sp.external_reference;
  const uuid = /^[0-9a-f-]{36}$/i.test(ref ?? '') ? ref : null;
  const { data: appt } = uuid
    ? await db().from('appointments').select('pet_name,appt_date,appt_time,status').eq('id', uuid).maybeSingle()
    : { data: null };

  const failed = sp.s === 'error';
  const confirmed = appt?.status === 'confirmed';
  const title = failed ? 'No se pudo procesar el pago' : confirmed ? '¡Turno confirmado!' : 'Estamos confirmando tu pago';
  const text = failed
    ? 'No se cobró nada. Podés volver a intentarlo, pero el horario se libera a los 15 minutos.'
    : confirmed
      ? `${appt!.pet_name} te espera el ${formatDateAR(appt!.appt_date)} a las ${String(appt!.appt_time).slice(0, 5)}.`
      : 'Apenas Mercado Pago acredite la seña, el turno queda asignado. Si el pago está pendiente, puede demorar unos minutos.';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <p className="mt-3 text-lg text-ink/70">{text}</p>
      <Link href="/" className="mt-8 rounded-xl bg-aqua px-6 py-3 font-display text-lg font-semibold text-white hover:bg-aqua-dark">
        {failed ? 'Volver a intentar' : 'Volver al inicio'}
      </Link>
    </main>
  );
}
