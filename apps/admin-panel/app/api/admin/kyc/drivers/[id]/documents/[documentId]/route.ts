import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; documentId: string } },
) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.text();
  const response = await fetch(
    `${gatewayBase}/api/admin/kyc/drivers/${params.id}/documents/${params.documentId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' },
      body,
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
