import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  rightActions,
  actions,
}: {
  title: string;
  subtitle?: string;
  rightActions?: ReactNode;
  actions?: ReactNode;
}) {
  const resolvedActions = actions ?? rightActions;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-400 md:text-base">{subtitle}</p> : null}
      </div>
      {resolvedActions ? <div className="flex items-center gap-2">{resolvedActions}</div> : null}
    </div>
  );
}
