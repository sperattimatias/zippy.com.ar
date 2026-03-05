import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET() {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return new Response('Unauthorized', { status: 401 });
  const upstream = await fetch(`${base}/api/admin/pricing`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function PUT(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return new Response('Unauthorized', { status: 401 });
  const upstream = await fetch(`${base}/api/admin/pricing`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: await req.text(),
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
