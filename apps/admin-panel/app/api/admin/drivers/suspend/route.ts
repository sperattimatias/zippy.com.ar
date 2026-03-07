import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function POST(request: Request) {
  return proxyJsonWithAccessToken(`/api/admin/drivers/suspend`, { method: 'POST' });
}
