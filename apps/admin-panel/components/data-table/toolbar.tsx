import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

type FacetedFilter = {
  key: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder,
  facetedFilters,
  onRefresh,
  onExport,
  enablePinning = false,
}: {
  table: Table<TData>;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  facetedFilters?: FacetedFilter[];
  onRefresh?: () => void;
  onExport?: () => void;
  enablePinning?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? 'Buscar...'}
        />
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button type="button" variant="outline" size="sm">
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuItem key={column.id} onClick={() => column.toggleVisibility()}>
                  <input type="checkbox" className="mr-2" checked={column.getIsVisible()} readOnly />
                  {String(column.columnDef.meta ?? column.id)}
                </DropdownMenuItem>
              ))}
            {enablePinning ? (
              <>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.id !== 'select')
                  .map((column) => (
                    <div key={`${column.id}-pin`} className="px-2 py-1.5 text-xs text-slate-300">
                      <p className="mb-1 font-medium">{String(column.columnDef.meta ?? column.id)}</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => column.pin('left')}>
                          Left
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => column.pin('right')}>
                          Right
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => column.pin(false)}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  ))}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {onRefresh ? (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Refrescar
          </Button>
        ) : null}
        {onExport ? (
          <Button type="button" variant="secondary" size="sm" onClick={onExport}>
            Export
          </Button>
        ) : null}
      </div>
      {facetedFilters?.length ? (
        <div className="grid gap-2 md:grid-cols-4">
          {facetedFilters.map((filter) => (
            <label key={filter.key} className="space-y-1 text-xs text-slate-400">
              <span>{filter.label}</span>
              <select
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100"
              >
                <option value="">Todos</option>
                {filter.options.map((option) => (
                  <option key={`${filter.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
