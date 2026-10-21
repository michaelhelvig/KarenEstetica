# Karen Estética Canina — Sistema de turnos

Next.js 15 (App Router) + Tailwind + Supabase + Mercado Pago + WhatsApp. Deploy en Vercel.
Única dependencia de runtime extra: `@supabase/supabase-js`. Mercado Pago y WhatsApp se llaman con `fetch`.

## Puesta en marcha

1. **Supabase**: SQL Editor → pegar y ejecutar `supabase/schema.sql` (crea tablas, RLS, grants y datos de ejemplo).
2. `cp .env.example .env.local` y completar las variables.
3. `npm install` y `npm run dev` → http://localhost:3000 (panel de la dueña en `/admin`).

## Flujo
1. La persona carga mascota/datos → elige día (verde = hay turnos, rojo = sin turnos) → elige hora.
2. Se crea el turno en `pending` (reserva el horario 15 min) y se abre Mercado Pago.
3. Mercado Pago llama a `/api/mp/webhook`; el servidor **verifica el pago contra la API de MP**, pasa el turno a `confirmed` y envía el WhatsApp a la dueña.
4. Si pagan después de vencer los 15 min y el horario ya lo tomó otra persona, queda en `refund_pending` y la dueña recibe un aviso para devolver la seña.

## Configuración desde Supabase (Table Editor)
- `settings`: seña (`deposit_amount`), duración del turno (`slot_minutes`), días hacia adelante, anticipación mínima.
- `schedule`: horarios por día (0 = domingo … 6 = sábado). Varios rangos por día permitidos. Sin filas = cerrado.
- `services`: servicios del desplegable.
- Días cerrados: desde `/admin` (o tabla `blocked_days`).

## Mercado Pago en local
El webhook y el retorno automático requieren una URL pública **https**. En `localhost` el pago funciona pero el turno
**no se confirma solo**. Opciones: probar con un túnel (`ngrok http 3000`, poniendo esa URL en `NEXT_PUBLIC_SITE_URL`) o
probar directamente en Vercel. Usá credenciales y usuarios de prueba de MP para testear sin dinero real.

## WhatsApp
- `callmebot` (default, gratis): la dueña manda "I allow callmebot to send me messages" al número de CallMeBot y recibe su apikey.
- `cloud`: WhatsApp Cloud API de Meta. Para escribir sin conversación previa de las últimas 24 h hay que usar una
  plantilla aprobada (`WHATSAPP_TEMPLATE`, 5 variables: mascota, dueño, teléfono, fecha, hora; idioma `es_AR`).

## Vercel
Cargar las mismas variables de `.env.example` en Project Settings → Environment Variables, con `NEXT_PUBLIC_SITE_URL`
apuntando al dominio final. Configurar en MP (si se usa el panel de Webhooks) la URL `https://TU-DOMINIO/api/mp/webhook`
con el evento *Pagos*; no hace falta si se usa el `notification_url` que ya envía el código.
