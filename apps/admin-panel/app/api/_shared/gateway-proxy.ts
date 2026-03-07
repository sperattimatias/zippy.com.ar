import { cookies } from 'next/headers';

type GatewayProxyOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: string;
};

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export function unauthorizedResponse() {
  return Response.json({ message: 'Unauthorized' }, { status: 401 });
}

export async function proxyJsonWithAccessToken(path: string, options: GatewayProxyOptions = {}) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return unauthorizedResponse();

  try {
    const response = await fetch(`${gatewayBase}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${access}`,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
      },
      ...(options.body ? { body: options.body } : {}),
      cache: 'no-store',
    });

    const raw = await response.text();
    if (!raw) return Response.json({}, { status: response.status });

    try {
      return Response.json(JSON.parse(raw), { status: response.status });
    } catch {
      return new Response(raw, {
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'text/plain' },
      });
    }
  } catch {
    return Response.json({ message: 'Gateway unavailable' }, { status: 502 });
  }
}
