import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/bonuses/${params.id}/revoke`, { method: 'POST', body });
}
