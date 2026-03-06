import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function ErrorState({
  title = 'Ocurrió un error',
  description,
  message,
  retry,
  onRetry,
}: {
  title?: string;
  description?: string;
  message?: string;
  retry?: () => void;
  onRetry?: () => void;
}) {
  const resolvedDescription = description ?? message ?? 'No pudimos cargar los datos.';
  const resolvedRetry = onRetry ?? retry;

  return (
    <Card className="border-rose-500/40 bg-rose-950/20">
      <CardHeader>
        <CardTitle className="text-rose-100">{title}</CardTitle>
        <CardDescription className="text-rose-200">{resolvedDescription}</CardDescription>
      </CardHeader>
      {resolvedRetry ? (
        <CardContent>
          <Button variant="destructive" size="sm" onClick={resolvedRetry}>
            Reintentar
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
