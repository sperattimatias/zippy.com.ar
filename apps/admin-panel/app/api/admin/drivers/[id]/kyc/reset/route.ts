import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/drivers/${params.id}/kyc/reset`, { method: 'PATCH' });
}
