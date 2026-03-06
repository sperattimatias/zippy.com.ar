'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../components/page/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { CopyText } from '../../../../components/common/CopyText';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EventTimeline } from '../../../../components/common/EventTimeline';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { toast } from '../../../../lib/toast';
import { ReasonDialog } from '../../../../components/forms/reason-dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { formatDateTime, formatMoney } from '../../../../lib/format';

const TripRouteMap = dynamic(
  () => import('../../../../components/maps/trip-route-map').then((mod) => mod.TripRouteMap),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-lg border border-slate-700 bg-slate-900/70" /> },
);

type TripDetail = {
  id: string;
  status: string;
  created_at: string;
  matched_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  passenger_user_id: string;
  driver_user_id?: string | null;
  origin_address: string;
  dest_address: string;
  price_base: number;
  price_final?: number | null;
  events: Array<{ id: string; type: string; created_at: string; payload_json?: unknown }>;
  locations: Array<{ id: string; lat: number; lng: number; created_at: string }>;
};

export default function AdminTripDetailPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reassignDriverId, setReassignDriverId] = useState('');
  const [incidentNote, setIncidentNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/trips/${params.id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar detalle de viaje');
      setTrip(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const postAction = async (path: string, body?: Record<string, string>) => {
    const response = await fetch(`/api/admin/trips/${params.id}/${path}`, {
      method: 'POST',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error ?? data.message ?? 'Acción falló');
    return data;
  };

  const onCancel = async (reason: string) => {
    setCancelLoading(true);
    try {
      await postAction('cancel', { reason });
      toast.success('Viaje cancelado.');
      setCancelOpen(false);
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error cancelando');
    } finally {
      setCancelLoading(false);
    }
  };

  const onReassign = async () => {
    if (!reassignDriverId.trim()) return toast.error('Ingresá driverId.');
    try {
      await postAction('reassign', { driverId: reassignDriverId });
      toast.success('Driver reasignado.');
      setReassignDriverId('');
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error reasignando');
    }
  };

  const onRetryMatching = async () => {
    try {
      await postAction('retry-matching');
      toast.success('Matching reintentado.');
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error reintentando matching');
    }
  };

  const onIncident = async () => {
    if (!incidentNote.trim()) return toast.error('Ingresá una nota de incidente.');
    try {
      await postAction('incident', { note: incidentNote });
      toast.success('Incidente registrado.');
      setIncidentNote('');
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error registrando incidente');
    }
  };
  const eventPoints = useMemo(() => {
    const values: Array<{ lat: number; lng: number }> = [];

    const readPoint = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      const candidate = value as { lat?: unknown; lng?: unknown; lon?: unknown; latitude?: unknown; longitude?: unknown };
      const lat = Number(candidate.lat ?? candidate.latitude);
      const lng = Number(candidate.lng ?? candidate.lon ?? candidate.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) values.push({ lat, lng });
    };

    for (const event of trip?.events ?? []) {
      readPoint(event.payload_json);
      if (Array.isArray(event.payload_json)) {
        for (const item of event.payload_json) readPoint(item);
      }
    }

    return values;
  }, [trip?.events]);

  const routePoints = useMemo(() => {
    const fromLocations = (trip?.locations ?? []).map((location) => ({ lat: location.lat, lng: location.lng }));
    return fromLocations.length > 0 ? fromLocations : eventPoints;
  }, [eventPoints, trip?.locations]);

  const pickup = routePoints[0];
  const dropoff = routePoints.length > 1 ? routePoints[routePoints.length - 1] : routePoints[0];

  const timelineItems = useMemo(
    () =>
      (trip?.events ?? [])
        .slice()
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .map((event) => ({
          id: event.id,
          title: event.type,
          timestamp: formatDateTime(event.created_at),
          description:
            event.payload_json == null
              ? undefined
              : JSON.stringify(event.payload_json).slice(0, 220),
          status: trip?.status,
        })),
    [trip?.events, trip?.status],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle del viaje" subtitle="Seguimiento completo del viaje y acciones operativas." />
      {loading && (
        <>
          <LoadingState message="Cargando viaje..." />
          <div className="h-[300px] animate-pulse rounded-lg border border-slate-700 bg-slate-900/70" />
        </>
      )}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && trip && (
        <>
          <SectionCard title={`Trip ${trip.id}`} action={<Link className="text-xs text-cyan-300 underline" href={`/admin/audit?entityType=trip&entityId=${trip.id}`}>Ver auditoría</Link>}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Estado:</span> <StatusBadge status={trip.status} /></p>
              <p><span className="text-slate-400">Passenger:</span> <CopyText value={trip.passenger_user_id} /></p>
              <p><span className="text-slate-400">Driver:</span> <CopyText value={trip.driver_user_id ?? undefined} /></p>
              <p><span className="text-slate-400">Creado:</span> {formatDateTime(trip.created_at)}</p>
              <p><span className="text-slate-400">Origen:</span> {trip.origin_address}</p>
              <p><span className="text-slate-400">Destino:</span> {trip.dest_address}</p>
              <p><span className="text-slate-400">Base:</span> {formatMoney(trip.price_base)}</p>
              <p><span className="text-slate-400">Final:</span> {formatMoney(trip.price_final)}</p>
            </div>
          </SectionCard>

          <SectionCard title="Ruta GPS">
            <p className="mb-2 text-xs text-slate-400">Inicio (pickup) en verde y fin (dropoff) en naranja.</p>
            {routePoints.length > 0 ? (
              <TripRouteMap pickup={pickup} dropoff={dropoff} points={routePoints} />
            ) : (
              <EmptyState message="Sin coordenadas disponibles" />
            )}
          </SectionCard>

          <SectionCard title="Timeline de eventos" description="Historial cronológico del viaje.">
            <EventTimeline
              items={timelineItems}
              emptyTitle="Sin eventos del viaje"
              emptyDescription="Todavía no se registraron eventos para este viaje."
            />
          </SectionCard>

          <SectionCard title="Acciones sensibles">
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancelar viaje
              </Button>
              <Button className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => void onRetryMatching()}>
                Reintentar matching
              </Button>
              <Input placeholder="Driver ID para reasignar" value={reassignDriverId} onChange={(e) => setReassignDriverId(e.target.value)} />
              <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => void onReassign()}>
                Reasignar
              </Button>
              <Textarea className="md:col-span-2" placeholder="Nota de incidente" value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} />
              <Button variant="secondary" className="md:col-span-2" onClick={() => void onIncident()}>
                Registrar incidente
              </Button>
            </div>
          </SectionCard>
        </>
      )}

      <ReasonDialog
        open={cancelOpen}
        title="Cancelar viaje"
        description="Esta acción impacta al pasajero y al conductor. Confirmá con un motivo claro."
        loading={cancelLoading}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => void onCancel(reason)}
      />

    </div>
  );
}
