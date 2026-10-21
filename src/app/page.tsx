import BookingForm from '@/components/BookingForm';
import { db } from '@/lib/supabase';
import { loadConfig } from '@/lib/availability';
import { nowAR } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [config, services] = await Promise.all([
    loadConfig(),
    db().from('services').select('name').eq('active', true).order('sort_order'),
  ]);

  return (
    <main>
      <header className="bg-aqua text-white">
        <div className="mx-auto max-w-2xl px-5 pb-14 pt-12">
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">Karen<br />Estética Canina</h1>
          <p className="mt-4 max-w-md text-lg text-white/90">
            Sacá el turno de tu mascota desde el celular. Elegí el día que esté en verde, el horario y confirmalo con la seña.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-2xl px-4 pb-16">
        <div className="rounded-3xl bg-white/70 p-5 shadow-xl shadow-ink/10 backdrop-blur sm:p-8">
          <BookingForm today={nowAR().date} deposit={config.deposit_amount} services={(services.data ?? []).map((s) => s.name)} />
        </div>
        <p className="mt-6 text-center text-sm text-ink/50">¿Necesitás cancelar o cambiar un turno? Escribinos por WhatsApp.</p>
      </div>
    </main>
  );
}
