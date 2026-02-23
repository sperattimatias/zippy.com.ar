import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${gatewayBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json();
  if (!response.ok) return Response.json(payload, { status: response.status });

  cookies().set('zippy_refresh_token', payload.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ access_token: payload.access_token });
}
