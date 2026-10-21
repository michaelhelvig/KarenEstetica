const API = 'https://api.mercadopago.com';
const token = () => {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN');
  return t;
};

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function createPreference(opts: { appointmentId: string; amount: number; expiresAt: Date }) {
  const site = siteUrl();
  const https = site.startsWith('https://'); // MP exige URL pública https para webhook y auto_return
  const res = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: opts.appointmentId, title: 'Seña de turno - Karen Estética Canina', quantity: 1, unit_price: opts.amount, currency_id: 'ARS' }],
      external_reference: opts.appointmentId,
      back_urls: {
        success: `${site}/turno/resultado?s=ok`,
        pending: `${site}/turno/resultado?s=pending`,
        failure: `${site}/turno/resultado?s=error`,
      },
      ...(https && { auto_return: 'approved', notification_url: `${site}/api/mp/webhook` }),
      expires: true,
      expiration_date_to: opts.expiresAt.toISOString(),
      statement_descriptor: 'KAREN ESTETICA',
    }),
  });
  if (!res.ok) throw new Error(`MP preference ${res.status}: ${await res.text()}`);
  return (await res.json()) as { id: string; init_point: string };
}

export async function getPayment(id: string) {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`MP payment ${res.status}`);
  return (await res.json()) as { status: string; external_reference?: string };
}
