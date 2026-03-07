import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/trips/${params.id}/retry-matching`, { method: 'POST' });
}
