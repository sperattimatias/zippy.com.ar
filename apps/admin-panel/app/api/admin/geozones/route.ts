import { proxyJsonWithAccessToken } from '../../_shared/gateway-proxy';

export async function GET() {
  return proxyJsonWithAccessToken(`/api/admin/geozones`);
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/geozones`, { method: 'POST', body });
}
