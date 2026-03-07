import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/safety-alerts/${params.id}`, { method: 'PATCH', body });
}
