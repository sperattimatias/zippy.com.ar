import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.toString();
  const suffix = search ? `?${search}` : '';
  return proxyJsonWithAccessToken(`/api/admin/support/tickets${suffix}`);
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/support/tickets`, { method: 'POST', body });
}
