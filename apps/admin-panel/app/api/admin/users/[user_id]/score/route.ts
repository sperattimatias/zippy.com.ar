import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function GET(req: Request, { params }: { params: { user_id: string } }) {
  const { searchParams } = new URL(req.url);
  const actorType = searchParams.get('actor_type') ?? 'DRIVER';
  return proxyJsonWithAccessToken(
    `/api/admin/users/${params.user_id}/score?actor_type=${encodeURIComponent(actorType)}`,
  );
}
