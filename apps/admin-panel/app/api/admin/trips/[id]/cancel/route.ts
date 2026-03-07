import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/trips/${params.id}/cancel`, { method: 'POST', body });
}
