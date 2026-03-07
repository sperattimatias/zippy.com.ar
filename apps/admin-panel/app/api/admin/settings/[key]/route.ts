import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/settings/${params.key}`, { method: 'PUT', body });
}
