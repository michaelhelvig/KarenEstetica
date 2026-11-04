export const dynamic = 'force-static';

export function GET() {
  const manifest = {
    id: '/admin',
    name: 'Karen Turnos',
    short_name: 'Karen Turnos',
    description: 'Panel de turnos de Karen Estética Canina.',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EEF7F6',
    theme_color: '#17A2A2',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json' } });
}
