import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function GET() {
  return proxyJsonWithAccessToken('/api/admin/operations/live');
}
