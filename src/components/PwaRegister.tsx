'use client';
import { useEffect } from 'react';

/** Registra el service worker (sólo en el panel /admin y en producción). */
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/admin' }).catch(() => { });
    }
  }, []);
  return null;
}