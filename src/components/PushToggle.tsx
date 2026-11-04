'use client';
import { useEffect, useState } from 'react';

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
type State = 'loading' | 'insecure' | 'nokey' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

function keyToBytes(b64: string) {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// El service worker sólo existe en la versión publicada (build/Vercel); si no responde, devolvemos null.
const getRegistration = () =>
  Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 5000))]);

const btn = 'rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50';

export default function PushToggle() {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    (async () => {
      // Service Worker, PushManager y Notification sólo existen en páginas HTTPS (o localhost).
      if (!window.isSecureContext) return setState('insecure');
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (ios && !standalone) return setState('ios-install'); // en iPhone sólo funciona con la app instalada
      if (!KEY) return setState('nokey');
      const missing = [
        ...('serviceWorker' in navigator ? [] : ['Service Worker']),
        ...('PushManager' in window ? [] : ['PushManager']),
        ...('Notification' in window ? [] : ['Notification']),
      ];
      if (missing.length) {
        const v = navigator.userAgent.match(/OS (\d+)[_.](\d+)/);
        setDetail(`Funciones que faltan: ${missing.join(', ')}.${ios && v ? ` iOS detectado: ${v[1]}.${v[2]}.` : ''}`);
        return setState('unsupported');
      }
      if (Notification.permission === 'denied') return setState('denied');
      try {
        const reg = await navigator.serviceWorker.getRegistration('/admin');
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch { setState('off'); }
    })();
  }, []);

  async function enable() {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission(); // debe llamarse directo desde el toque del botón
      if (perm !== 'granted') return setState(perm === 'denied' ? 'denied' : 'off');
      const reg = await getRegistration();
      if (!reg) return setMsg('Las notificaciones sólo funcionan en la versión publicada (npm run build + npm start, o Vercel).');
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(KEY) }));
      const r = await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) throw new Error();
      setState('on');
      setMsg('¡Listo! Tocá "Enviar prueba" para ver cómo llega.');
    } catch {
      setMsg('No se pudieron activar las notificaciones. Probá de nuevo.');
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/admin/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState('off');
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    const r = await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) });
    setMsg(r.ok ? 'Te mandamos una notificación de prueba. Si no llega en unos segundos, revisá los permisos del dispositivo.' : 'No se pudo enviar la prueba.');
    setBusy(false);
  }

  if (state === 'loading') return null;
  const note = 'text-sm text-ink/70';

  return (
    <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Notificaciones</h2>
      {state === 'insecure' && <p className={note}>Las notificaciones solo funcionan si la página se abre por <b>https://</b> (Deploy ya hecho). Estás entrando por una dirección <b>http://</b>, que el celular no considera segura. Abrí el sitio por https y, en iPhone, volvé a agregar la app a inicio desde esa dirección.</p>}
      {state === 'ios-install' && <p className={note}>En iPhone, primero agregá esta app a la pantalla de inicio (Compartir → “Agregar a inicio”) y abrila desde el ícono. Ahí vas a poder activar las notificaciones.</p>}
      {state === 'nokey' && <p className={note}>Faltan configurar las claves de notificaciones (VAPID) en el servidor.</p>}
      {state === 'unsupported' && (
        <div className="space-y-1">
          <p className={note}>Este dispositivo o navegador no permite notificaciones. En iPhone hace falta iOS 16.4 o más nuevo y abrir la app desde su ícono de inicio; si ya la tenías instalada, borrala y volvé a agregarla desde Safari entrando a /admin. En computadora probá con Chrome o Edge.</p>
          {detail && <p className="text-xs text-ink/50">{detail}</p>}
        </div>
      )}
      {state === 'denied' && <p className={note}>Las notificaciones están bloqueadas. Activalas desde los ajustes del navegador o del sistema para este sitio y volvé a intentar.</p>}
      {state === 'off' && (
        <div className="space-y-2">
          <p className={note}>Recibí un aviso en este dispositivo cada vez que entre un turno nuevo.</p>
          <button onClick={enable} disabled={busy} className={`${btn} bg-aqua text-white hover:bg-aqua-dark`}>🔔 Activar notificaciones</button>
        </div>
      )}
      {state === 'on' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-700">✓ Notificaciones activadas en este dispositivo</p>
          <div className="flex gap-2">
            <button onClick={test} disabled={busy} className={`${btn} bg-aqua text-white hover:bg-aqua-dark`}>Enviar prueba</button>
            <button onClick={disable} disabled={busy} className={`${btn} border-2 border-ink/15`}>Desactivar</button>
          </div>
        </div>
      )}
      {msg && <p className={note}>{msg}</p>}
    </section>
  );
}