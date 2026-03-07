import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function POST() {
  return proxyJsonWithAccessToken(`/api/admin/settings/test/mercadopago`, { method: 'POST' });
}
