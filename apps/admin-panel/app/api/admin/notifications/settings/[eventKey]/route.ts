import { cookies } from 'next/headers';
const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function PATCH(req: Request, ctx: { params: { eventKey: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return new Response('Unauthorized', { status: 401 });
  const upstream = await fetch(`${base}/api/admin/notifications/settings/${ctx.params.eventKey}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: await req.text(),
  });
  return new Response(await upstream.text(), { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' } });
}
