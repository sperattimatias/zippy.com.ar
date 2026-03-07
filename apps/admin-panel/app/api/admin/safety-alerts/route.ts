import { proxyJsonWithAccessToken } from '../../_shared/gateway-proxy';

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.toString();
  const suffix = search ? `?${search}` : '';
  return proxyJsonWithAccessToken(`/api/admin/safety-alerts${suffix}`);
}
