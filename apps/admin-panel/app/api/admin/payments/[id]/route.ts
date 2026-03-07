import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/payments/${params.id}`);
}
