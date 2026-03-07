import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/geozones/${params.id}`, { method: 'PATCH', body });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/geozones/${params.id}`, { method: 'DELETE' });
}
