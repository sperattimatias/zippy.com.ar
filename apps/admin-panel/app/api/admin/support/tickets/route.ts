import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const search = new URL(req.url).searchParams.toString();
  const suffix = search ? `?${search}` : '';
  const res = await fetch(`${base}/api/admin/support/tickets${suffix}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  return Response.json(await res.json(), { status: res.status });
}

export async function POST(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${base}/api/admin/support/tickets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' },
    body,
  });
  return Response.json(await res.json(), { status: res.status });
}
