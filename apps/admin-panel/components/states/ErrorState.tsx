import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Card className="border-rose-500/40 bg-rose-950/20">
      <CardHeader>
        <CardTitle className="text-rose-100">Ocurrió un error</CardTitle>
        <CardDescription className="text-rose-200">{message}</CardDescription>
      </CardHeader>
      {retry ? (
        <CardContent>
          <Button variant="destructive" size="sm" onClick={retry}>
            Reintentar
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
