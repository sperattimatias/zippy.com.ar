import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/support/tickets/${params.id}`);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/support/tickets/${params.id}`, { method: 'PATCH', body });
}
