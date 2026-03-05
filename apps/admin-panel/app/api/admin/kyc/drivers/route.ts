import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const query = new URL(req.url).searchParams.toString();
  const suffix = query ? `?${query}` : '';
  const response = await fetch(`${gatewayBase}/api/admin/kyc/drivers${suffix}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });

  return Response.json(await response.json(), { status: response.status });
}
