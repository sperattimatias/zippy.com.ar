import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  const upstream = await fetch(`${base}/api/admin/reports/export.csv?${url.searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'attachment; filename=reports-overview.csv',
    },
  });
}
