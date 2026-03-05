'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';
import { ReasonDialog } from '../../../../components/forms/reason-dialog';

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

type ToastState = { tone: 'success' | 'error'; message: string } | null;

function RouteMap({ locations }: { locations: Array<{ lat: number; lng: number }> }) {
  const width = 700;
  const height = 240;
  const bounds = useMemo(() => {
    if (locations.length === 0) return { minLat: -34.61, maxLat: -34.59, minLng: -58.42, maxLng: -58.38 };
    const lats = locations.map((location) => location.lat);
    const lngs = locations.map((location) => location.lng);
    return { minLat: Math.min(...lats) - 0.005, maxLat: Math.max(...lats) + 0.005, minLng: Math.min(...lngs) - 0.005, maxLng: Math.max(...lngs) + 0.005 };
  }, [locations]);

  const toPoint = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * width;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * height;
    return { x, y };
  };

  const path = locations.map((location) => {
    const point = toPoint(location.lat, location.lng);
    return `${point.x},${point.y}`;
  });

  return (
    <svg className="w-full rounded border border-slate-700 bg-slate-950" viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill="#020617" />
      {path.length > 1 && <polyline points={path.join(' ')} fill="none" stroke="#22d3ee" strokeWidth={2} />}
      {locations.map((location, index) => {
        const point = toPoint(location.lat, location.lng);
        return <circle key={`${location.lat}-${location.lng}-${index}`} cx={point.x} cy={point.y} r={3} fill="#f8fafc" />;
      })}
    </svg>
  );
}

export default function AdminTripDetailPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

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
      setToast({ tone: 'success', message: 'Viaje cancelado.' });
      setCancelOpen(false);
      await load();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error cancelando' });
    } finally {
      setCancelLoading(false);
    }
  };

  const onReassign = async () => {
    if (!reassignDriverId.trim()) return setToast({ tone: 'error', message: 'Ingresá driverId.' });
    try {
      await postAction('reassign', { driverId: reassignDriverId });
      setToast({ tone: 'success', message: 'Driver reasignado.' });
      setReassignDriverId('');
      await load();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error reasignando' });
    }
  };

  const onRetryMatching = async () => {
    try {
      await postAction('retry-matching');
      setToast({ tone: 'success', message: 'Matching reintentado.' });
      await load();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error reintentando matching' });
    }
  };

  const onIncident = async () => {
    if (!incidentNote.trim()) return setToast({ tone: 'error', message: 'Ingresá una nota de incidente.' });
    try {
      await postAction('incident', { note: incidentNote });
      setToast({ tone: 'success', message: 'Incidente registrado.' });
      setIncidentNote('');
      await load();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error registrando incidente' });
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando viaje..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && trip && (
        <>
          <AdminCard title={`Trip ${trip.id}`} action={<Link className="text-xs text-cyan-300 underline" href={`/admin/audit?entityType=trip&entityId=${trip.id}`}>Ver auditoría</Link>}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Estado:</span> {trip.status}</p>
              <p><span className="text-slate-400">Passenger:</span> {trip.passenger_user_id}</p>
              <p><span className="text-slate-400">Driver:</span> {trip.driver_user_id ?? '-'}</p>
              <p><span className="text-slate-400">Creado:</span> {new Date(trip.created_at).toLocaleString()}</p>
              <p><span className="text-slate-400">Origen:</span> {trip.origin_address}</p>
              <p><span className="text-slate-400">Destino:</span> {trip.dest_address}</p>
              <p><span className="text-slate-400">Base:</span> {trip.price_base}</p>
              <p><span className="text-slate-400">Final:</span> {trip.price_final ?? '-'}</p>
            </div>
          </AdminCard>

          <AdminCard title="Ruta GPS">
            <RouteMap locations={trip.locations.map((location) => ({ lat: location.lat, lng: location.lng }))} />
          </AdminCard>

          <AdminCard title="Eventos">
            <div className="max-h-80 overflow-auto text-sm">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-slate-400"><tr><th className="p-2">Fecha</th><th className="p-2">Tipo</th><th className="p-2">Payload</th></tr></thead>
                <tbody>
                  {trip.events.map((event) => (
                    <tr key={event.id} className="border-t border-slate-800 align-top">
                      <td className="p-2 whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</td>
                      <td className="p-2 font-medium">{event.type}</td>
                      <td className="p-2"><pre className="max-w-[560px] overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">{JSON.stringify(event.payload_json ?? {}, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <AdminCard title="Acciones sensibles">
            <div className="grid gap-3 md:grid-cols-2">
              <button className="rounded bg-rose-700 px-3 py-2 text-sm text-white" onClick={() => setCancelOpen(true)}>
                Cancelar viaje
              </button>
              <button className="rounded bg-amber-600 px-3 py-2 text-sm text-white" onClick={() => void onRetryMatching()}>
                Retry matching
              </button>
              <input className="rounded bg-slate-950 p-2 text-sm" placeholder="Driver ID para reasignar" value={reassignDriverId} onChange={(e) => setReassignDriverId(e.target.value)} />
              <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => void onReassign()}>
                Reasignar
              </button>
              <textarea className="rounded bg-slate-950 p-2 text-sm md:col-span-2" placeholder="Nota de incidente" value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} />
              <button className="rounded bg-slate-700 px-3 py-2 text-sm text-white md:col-span-2" onClick={() => void onIncident()}>
                Registrar incidente
              </button>
            </div>
          </AdminCard>
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

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
