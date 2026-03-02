import { cookies } from 'next/headers';

function getGatewayBase(): string {
  // ✅ Dentro de Docker: SIEMPRE usar el DNS del servicio
  // Si no está seteada la env, dejamos un fallback seguro para el compose.
  return process.env.API_GATEWAY_INTERNAL_URL ?? 'http://api-gateway:3000';
}

export async function POST(request: Request) {
  const body = await request.json();

  const gatewayBase = getGatewayBase();
  const url = `${gatewayBase}/api/auth/login`;

  // ✅ Evita cuelgues por network/DNS/localhost mal apuntado
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });

    // Intentamos parsear JSON, pero si falla devolvemos texto
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      // Devolvemos error tal cual, con status correcto
      return Response.json(typeof payload === 'string' ? { error: payload } : payload, {
        status: response.status,
      });
    }

    // ✅ Esperamos estos campos desde auth: access_token y refresh_token
    // Si viniera distinto, lo dejamos explícito para debug
    if (typeof payload !== 'object' || payload === null) {
      return Response.json({ error: 'Invalid auth payload', payload }, { status: 502 });
    }

    const { refresh_token, access_token } = payload as any;

    if (!refresh_token || !access_token) {
      return Response.json({ error: 'Missing tokens in auth payload', payload }, { status: 502 });
    }

    const store = cookies();
    const secureCookies = process.env.NODE_ENV === 'production';

    store.set('zippy_refresh_token', refresh_token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    store.set('zippy_access_token', access_token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    // ✅ Error controlado con info útil (no cuelga)
    const message =
      err?.name === 'AbortError' ? 'Gateway request timed out' : (err?.message ?? String(err));

    return Response.json(
      {
        error: 'FETCH_FAILED',
        message,
        gatewayBase,
        url,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
