import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return new Response('Unauthorized', { status: 401 });
  const upstream = await fetch(`${base}/api/admin/incentives/${ctx.params.id}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
