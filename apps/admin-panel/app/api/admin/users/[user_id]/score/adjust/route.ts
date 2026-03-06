import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function POST(req: Request, { params }: { params: { user_id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/users/${params.user_id}/score/adjust`, {
    method: 'POST',
    body: await req.text(),
  });
}
