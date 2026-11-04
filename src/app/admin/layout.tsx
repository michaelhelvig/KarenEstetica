import type { Metadata } from 'next';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Karen Turnos',
  manifest: '/admin/manifest.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Karen Turnos', statusBarStyle: 'default' },
};

// Chrome/Edge disparan "beforeinstallprompt" una sola vez, apenas carga la página.
// Lo guardamos acá, antes de que React cargue y antes del login, para que el botón lo pueda usar después.
const CAPTURE = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installEvt=e;window.dispatchEvent(new Event('install-available'));});`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: CAPTURE }} />
      {children}
      <PwaRegister />
    </>
  );
}