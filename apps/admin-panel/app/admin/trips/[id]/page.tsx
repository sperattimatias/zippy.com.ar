'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

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
    if (locations.length === 0) {
      return { minLat: -34.61, maxLat: -34.59, minLng: -58.42, maxLng: -58.38 };
    }
    const lats = locations.map((location) => location.lat);
    const lngs = locations.map((location) => location.lng);
    return {
      minLat: Math.min(...lats) - 0.005,
      maxLat: Math.max(...lats) + 0.005,
      minLng: Math.min(...lngs) - 0.005,
      maxLng: Math.max(...lngs) + 0.005,
    };
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

  const [cancelReason, setCancelReason] = useState('');
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [incidentNote, setIncidentNote] = useState('');

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

  const onCancel = async () => {
    if (!cancelReason.trim()) {
      setToast({ tone: 'error', message: 'Ingresá motivo de cancelación.' });
      return;
    }
    try {
      await postAction('cancel', { reason: cancelReason });
      setToast({ tone: 'success', message: 'Viaje cancelado.' });
      setCancelReason('');
      await load();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error cancelando' });
    }
  };

  const onReassign = async () => {
    if (!reassignDriverId.trim()) {
      setToast({ tone: 'error', message: 'Ingresá driverId.' });
      return;
    }
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
    if (!incidentNote.trim()) {
      setToast({ tone: 'error', message: 'Ingresá descripción de incidente.' });
      return;
    }
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
      {loading && <LoadingState message="Cargando detalle..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && trip && (
        <>
          <AdminCard title={`Trip ${trip.id}`}>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p><span className="text-slate-400">Estado:</span> {trip.status}</p>
              <p><span className="text-slate-400">Rider:</span> {trip.passenger_user_id}</p>
              <p><span className="text-slate-400">Driver:</span> {trip.driver_user_id ?? '-'}</p>
              <p><span className="text-slate-400">Costo:</span> {trip.price_final ?? trip.price_base}</p>
              <p><span className="text-slate-400">Creado:</span> {new Date(trip.created_at).toLocaleString()}</p>
              <p><span className="text-slate-400">Completado:</span> {trip.completed_at ? new Date(trip.completed_at).toLocaleString() : '-'}</p>
              <p><span className="text-slate-400">Origen:</span> {trip.origin_address}</p>
              <p><span className="text-slate-400">Destino:</span> {trip.dest_address}</p>
            </div>
          </AdminCard>

          <AdminCard title="Acciones">
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <input className="rounded bg-slate-950 p-2" placeholder="Motivo cancelación" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <button className="rounded bg-rose-600 px-3 py-2 text-white" onClick={() => void onCancel()}>Cancelar viaje</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input className="rounded bg-slate-950 p-2" placeholder="driverId" value={reassignDriverId} onChange={(e) => setReassignDriverId(e.target.value)} />
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void onReassign()}>Reasignar driver</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void onRetryMatching()}>Reintentar matching</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input className="rounded bg-slate-950 p-2 min-w-[300px]" placeholder="Nota de incidente" value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} />
                <button className="rounded bg-amber-600 px-3 py-2 text-white" onClick={() => void onIncident()}>Marcar incidente</button>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Ruta">
            <RouteMap locations={trip.locations} />
          </AdminCard>

          <AdminCard title="Timeline de eventos">
            <ul className="space-y-1 text-sm">
              {trip.events.map((event) => (
                <li key={event.id}>{new Date(event.created_at).toLocaleString()} — {event.type}</li>
              ))}
            </ul>
          </AdminCard>
        </>
      )}

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
