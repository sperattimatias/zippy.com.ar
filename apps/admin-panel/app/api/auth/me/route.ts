const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth) return Response.json({ message: 'Missing bearer token' }, { status: 401 });

  const response = await fetch(`${gatewayBase}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: auth },
    cache: 'no-store',
  });

  const payload = await response.json();
  return Response.json(payload, { status: response.status });
}
