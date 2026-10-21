import type { Metadata } from 'next';
import { Baloo_2, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Baloo_2({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-display' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Karen Estética Canina | Sacá tu turno',
  description: 'Reservá online el turno de baño y corte para tu mascota. Elegí día y horario y confirmá con una seña por Mercado Pago.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
