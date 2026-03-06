import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function EmptyState({
  title,
  description,
  action,
  message,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  message?: string;
}) {
  const resolvedTitle = title ?? message ?? 'No hay resultados';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
