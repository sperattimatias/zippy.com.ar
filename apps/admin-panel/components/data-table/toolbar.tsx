import { Input } from '../ui/input';
import { Button } from '../ui/button';

type ColumnToggle = { id: string; label: string; visible: boolean; canHide?: boolean };

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  columns,
  onToggleColumn,
  onExport,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  columns: ColumnToggle[];
  onToggleColumn: (id: string) => void;
  onExport?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? 'Buscar...'}
        />
        <details className="relative">
          <summary className="list-none">
            <Button type="button" variant="outline" size="sm">
              Columnas
            </Button>
          </summary>
          <div className="absolute right-0 z-20 mt-2 min-w-[180px] space-y-1 rounded-md border border-slate-700 bg-slate-900 p-2">
            {columns.filter((c) => c.canHide !== false).map((column) => (
              <label key={column.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => onToggleColumn(column.id)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </details>
        {onExport ? (
          <Button type="button" variant="secondary" size="sm" onClick={onExport}>
            Export
          </Button>
        ) : null}
      </div>
      {filters ? <div className="grid gap-2 md:grid-cols-4">{filters}</div> : null}
    </div>
  );
}
