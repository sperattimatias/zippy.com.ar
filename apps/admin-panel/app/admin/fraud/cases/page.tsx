'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../components/page/PageHeader';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';

type FraudCase = {
  id: string;
  status: string;
  severity: string;
  title: string;
  summary?: string;
  created_at: string;
  primary_user_id?: string | null;
  related_driver_id?: string | null;
  related_trip_id?: string | null;
};

export default function FraudCasesPage() {
  const [rows, setRows] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (severity) p.set('severity', severity);
    if (q) p.set('q', q);
    return p.toString();
  }, [status, severity, q]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/cases${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar casos de fraude');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [qs]);

  return (
    <div className="space-y-6">
      <PageHeader title="Casos de fraude" subtitle="Monitoreá alertas, priorizá casos y tomá decisiones operativas." />

      <SectionCard title="Filtros de búsqueda">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas las severidades</option>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input className="md:col-span-2" placeholder="Buscar por título o resumen" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Listado de casos">
        {loading && <LoadingState message="Cargando casos..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState title="No hay casos" description="No hay casos para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <Table className="min-w-[1150px] text-left">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Score/Evidencia</TableHead>
                  <TableHead>Entidades</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="font-mono text-xs text-slate-300">{r.id}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.severity}</TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="max-w-[240px] text-slate-300">{r.summary ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-300">
                      <div>user: {r.primary_user_id ?? '-'}</div>
                      <div>driver: {r.related_driver_id ?? '-'}</div>
                      <div>trip: {r.related_trip_id ?? '-'}</div>
                    </TableCell>
                    <TableCell className="text-slate-300">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><Link className="text-cyan-400 hover:text-cyan-300" href={`/admin/fraud/cases/${r.id}`}>Abrir</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
