import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function GET(_req: Request, { params }: { params: { user_id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/fraud/users/${params.user_id}/risk`);
}
