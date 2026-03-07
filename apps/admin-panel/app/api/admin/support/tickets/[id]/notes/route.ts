import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/support/tickets/${params.id}/notes`, { method: 'POST', body });
}
