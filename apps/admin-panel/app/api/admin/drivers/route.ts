import { cookies } from 'next/headers';

const gatewayBase =
  process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const search = new URL(req.url).searchParams.toString();
  const suffix = search ? `?${search}` : '';
  const response = await fetch(`${gatewayBase}/api/admin/drivers${suffix}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  const payload = await response.json();
  return Response.json(payload, { status: response.status });
}
