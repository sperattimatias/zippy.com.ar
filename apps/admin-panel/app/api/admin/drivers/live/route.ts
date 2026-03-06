import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const search = new URL(req.url).searchParams.toString();
    const suffix = search ? `?${search}` : '';
    const res = await fetch(`${base}/api/admin/drivers/live${suffix}`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: 'no-store',
    });

    const payload = await res.json();
    return Response.json(payload, { status: res.status });
  } catch {
    return Response.json({ message: 'Gateway unavailable' }, { status: 502 });
  }
}
