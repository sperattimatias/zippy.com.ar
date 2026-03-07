import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/payments/${params.id}/flag`, { method: 'PATCH', body });
}
