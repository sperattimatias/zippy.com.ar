import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/incentives/${ctx.params.id}`);
}
