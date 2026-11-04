'use client';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void> };

const DEFAULT_STYLE = 'rounded-xl bg-white/15 px-4 py-2.5 font-semibold text-white ring-2 ring-white/60 transition hover:bg-white/25';

/**
 * Botón "Instalar app".
 * - Android/Chrome: abre el cuadro de instalación nativo.
 * - iPhone/iPad (Safari no permite instalar por código): muestra los pasos.
 * - Si la app ya está instalada (o el navegador no soporta instalar), no se muestra.
 */
export default function InstallButton({ label = 'Instalar app', className = DEFAULT_STYLE }: { label?: string; className?: string }) {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true); // oculto hasta verificar
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // PwaRegister guarda el evento en window apenas se dispara (puede ser antes de que este botón exista)
    const w = window as Window & { __installEvt?: Event };
    const grab = () => { if (w.__installEvt) setEvt(w.__installEvt as InstallEvent); };
    grab();
    const onInstalled = () => { setInstalled(true); setEvt(null); setHelp(false); w.__installEvt = undefined; };
    window.addEventListener('install-available', grab);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('install-available', grab);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  async function click() {
    if (evt) { await evt.prompt(); setEvt(null); (window as Window & { __installEvt?: Event }).__installEvt = undefined; } else setHelp((h) => !h);
  }

  return (
    <div>
      <button type="button" onClick={click} className={className}>📲 {label}</button>
      {help && (
        <p className="mt-3 max-w-xs rounded-xl bg-white p-3 text-sm text-ink shadow">
          En tu iPhone: tocá el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba) y elegí <b>“Agregar a inicio”</b>.
        </p>
      )}
    </div>
  );
}