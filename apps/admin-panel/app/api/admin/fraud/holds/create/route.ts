import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function POST(req: Request) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/fraud/holds/create`, { method: 'POST', body });
}
