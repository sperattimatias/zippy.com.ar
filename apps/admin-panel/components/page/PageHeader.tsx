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
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="max-w-3xl space-y-1.5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-100 md:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-relaxed text-slate-400 md:text-base">{subtitle}</p> : null}
      </div>
      {resolvedActions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{resolvedActions}</div> : null}
    </div>
  );
}
