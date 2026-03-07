import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function PATCH(req: Request, { params }: { params: { user_id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/users/${params.user_id}/status`, {
    method: 'PATCH',
    body: await req.text(),
  });
}
