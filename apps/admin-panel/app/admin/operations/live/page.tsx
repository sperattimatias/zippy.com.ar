'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '../../../../components/page/PageHeader';
import { SectionCard } from '../../../../components/common/SectionCard';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { formatDateTime } from '../../../../lib/format';
import { RefreshCw } from 'lucide-react';

type Point = { lat: number; lng: number };
type DriverMapMarker = Point & {
  driverId: string;
  operationalStatus: OperationalStatus;
  onTrip: boolean;
};

type OperationalStatus = 'available' | 'on_trip' | 'stale';
type LiveDriver = {
  driverId: string;
  lat: number;
  lng: number;
  lastSeenAt: string | null;
  isOnline: boolean;
  isFresh: boolean;
  operationalStatus: OperationalStatus;
  onTrip: boolean;
};
type LiveDriversStats = {
  onlineDrivers: number;
  freshDrivers: number;
  staleDrivers: number;
  onTripDrivers: number;
  idleDrivers: number;
};
type LiveDriversPayload = {
  generatedAt: string;
  drivers: LiveDriver[];
  stats: LiveDriversStats;
};
type TripRow = Record<string, unknown> & { id?: string | number };

type TripPath = {
  id: string;
  points: Point[];
};

const FIRMA_CENTER: [number, number] = [-33.4592, -61.4832];
const REFRESH_MS = 15_000;

const OperationsLiveMap = dynamic(
  () =>
    import('../../../../components/maps/operations-live-map').then((mod) => mod.OperationsLiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[560px] animate-pulse rounded-lg border border-slate-700 bg-slate-900/70" />
    ),
  },
);

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePoint(value: unknown): Point | null {
  const record = asRecord(value);
  if (!record) return null;

  const lat = asNumber(record.lat ?? record.latitude);
  const lng = asNumber(record.lng ?? record.lon ?? record.longitude);

  if (lat == null || lng == null) return null;

  return { lat, lng };
}

function parseTripPoints(trip: Record<string, unknown>) {
  const directCandidates = [trip.route_points, trip.routePoints, trip.points, trip.locations];
  for (const candidate of directCandidates) {
    const points = asArray<unknown>(candidate).map(parsePoint).filter(Boolean) as Point[];
    if (points.length > 0) return points;
  }

  const eventPoints = asArray<unknown>(trip.events)
    .flatMap((event) => {
      const eventRecord = asRecord(event);
      if (!eventRecord) return [];
      const payload = eventRecord.payload_json;
      if (Array.isArray(payload)) return payload;
      return payload ? [payload] : [];
    })
    .map(parsePoint)
    .filter(Boolean) as Point[];

  return eventPoints;
}

function extractItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  const items = record.items;
  if (Array.isArray(items)) return items;
  return [];
}

function isOperationalStatus(value: unknown): value is OperationalStatus {
  return value === 'available' || value === 'on_trip' || value === 'stale';
}

function isLiveDriver(value: unknown): value is LiveDriver {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.driverId === 'string' &&
    typeof record.lat === 'number' &&
    Number.isFinite(record.lat) &&
    typeof record.lng === 'number' &&
    Number.isFinite(record.lng) &&
    (typeof record.lastSeenAt === 'string' || record.lastSeenAt === null) &&
    typeof record.isOnline === 'boolean' &&
    typeof record.isFresh === 'boolean' &&
    isOperationalStatus(record.operationalStatus) &&
    typeof record.onTrip === 'boolean'
  );
}

function isLiveDriversStats(value: unknown): value is LiveDriversStats {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.onlineDrivers === 'number' &&
    typeof record.freshDrivers === 'number' &&
    typeof record.staleDrivers === 'number' &&
    typeof record.onTripDrivers === 'number' &&
    typeof record.idleDrivers === 'number'
  );
}

function parseLiveDriversPayload(payload: unknown): LiveDriversPayload {
  const record = asRecord(payload);
  if (!record) {
    return {
      generatedAt: new Date().toISOString(),
      drivers: [],
      stats: { onlineDrivers: 0, freshDrivers: 0, staleDrivers: 0, onTripDrivers: 0, idleDrivers: 0 },
    };
  }

  const drivers = asArray<unknown>(record.drivers).filter(isLiveDriver);
  const stats = isLiveDriversStats(record.stats)
    ? record.stats
    : {
        onlineDrivers: drivers.length,
        freshDrivers: drivers.filter((driver) => driver.isFresh).length,
        staleDrivers: 0,
        onTripDrivers: drivers.filter((driver) => driver.onTrip).length,
        idleDrivers: drivers.filter((driver) => !driver.onTrip).length,
      };

  return {
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString(),
    drivers,
    stats,
  };
}

export default function AdminOperationsLivePage() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [driverMarkers, setDriverMarkers] = useState<DriverMapMarker[]>([]);
  const [tripPaths, setTripPaths] = useState<TripPath[]>([]);
  const [openIncidents, setOpenIncidents] = useState(0);
  const [driverStats, setDriverStats] = useState<LiveDriversStats>({
    onlineDrivers: 0,
    freshDrivers: 0,
    staleDrivers: 0,
    onTripDrivers: 0,
    idleDrivers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const [driversRes, tripsRes, incidentsRes] = await Promise.all([
        fetch('/api/admin/drivers/live', { cache: 'no-store' }),
        fetch('/api/admin/trips?status=IN_PROGRESS&page_size=50', { cache: 'no-store' }),
        fetch('/api/admin/safety-alerts?status=OPEN', { cache: 'no-store' }),
      ]);

      if (!driversRes.ok) throw new Error('No se pudieron cargar conductores.');
      if (!tripsRes.ok) throw new Error('No se pudieron cargar viajes activos.');
      if (!incidentsRes.ok) throw new Error('No se pudieron cargar incidentes.');

      const [driversPayload, tripsPayload, incidentsPayload] = await Promise.all([
        driversRes.json(),
        tripsRes.json(),
        incidentsRes.json(),
      ]);

      const liveDriversPayload = parseLiveDriversPayload(driversPayload);
      const liveDrivers = liveDriversPayload.drivers;
      const trips = extractItems(tripsPayload) as TripRow[];
      const incidents = extractItems(incidentsPayload);

      const markers = liveDrivers.map((driver) => ({
        driverId: driver.driverId,
        lat: driver.lat,
        lng: driver.lng,
        operationalStatus: driver.operationalStatus,
        onTrip: driver.onTrip,
      }));
      const paths = trips
        .map((trip, index) => {
          const id = String(trip.id ?? `trip-${index}`);
          const pathPoints = parseTripPoints(trip);
          return { id, points: pathPoints };
        })
        .filter((trip) => trip.points.length > 0);

      setDrivers(liveDrivers);
      setDriverMarkers(markers);
      setTripPaths(paths);
      setOpenIncidents(incidents.length);
      setDriverStats(liveDriversPayload.stats);
      setLastUpdatedAt(liveDriversPayload.generatedAt);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No pudimos actualizar el mapa operativo.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const activeTrips = tripPaths.length;
  const onlineDrivers = driverStats.onlineDrivers;
  const hasPositions = driverMarkers.length > 0 || activeTrips > 0;
  const statusCount = useMemo(
    () => ({
      available: drivers.filter((driver) => driver.operationalStatus === 'available').length,
      onTrip: drivers.filter((driver) => driver.onTrip).length,
      stale: drivers.filter((driver) => driver.operationalStatus === 'stale').length,
    }),
    [drivers],
  );

  const metrics = useMemo(
    () => [
      { label: 'Conductores online', value: onlineDrivers, tone: 'success' as const, badge: 'Live' },
      { label: 'Disponibles', value: driverStats.idleDrivers, tone: 'success' as const, badge: 'Idle' },
      { label: 'En viaje', value: driverStats.onTripDrivers, tone: 'warning' as const, badge: 'On trip' },
      { label: 'Stale', value: driverStats.staleDrivers, tone: 'danger' as const },
      { label: 'Viajes activos', value: activeTrips, tone: 'warning' as const },
      { label: 'Incidentes abiertos', value: openIncidents, tone: 'danger' as const },
    ],
    [
      activeTrips,
      driverStats.idleDrivers,
      driverStats.onTripDrivers,
      driverStats.staleDrivers,
      onlineDrivers,
      openIncidents,
    ],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="Operación en tiempo real"
        subtitle="Monitoreo en tiempo real de conductores, viajes e incidentes en Firmat."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Refresh automático: 15s</Badge>
            <Badge variant="outline">Generado: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '-'}</Badge>
            <Button variant="secondary" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar ahora
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <SectionCard
          title="Mapa operativo"
          description="Seguimiento en vivo de disponibilidad de conductores y viajes activos."
        >
          {loading ? <LoadingState message="Sincronizando posiciones y viajes activos..." /> : null}
          {!loading && error ? <ErrorState message={error} retry={() => void load()} /> : null}
          {!loading && !error && !hasPositions ? (
            <EmptyState
              title="Sin actividad operativa visible"
              description="No hay conductores live ni viajes activos para mapear en este momento."
              action={
                <Button onClick={() => void load()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              }
            />
          ) : null}
          {!loading && !error && hasPositions ? (
            <OperationsLiveMap
              center={FIRMA_CENTER}
              driverMarkers={driverMarkers}
              tripPaths={tripPaths}
            />
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Métricas rápidas" description="Lectura operativa actual de la flota live.">
            <div className="grid gap-3 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-semibold">{metric.value}</p>
                    <Badge
                      variant={
                        metric.tone === 'success'
                          ? 'success'
                          : metric.tone === 'danger'
                            ? 'danger'
                            : 'outline'
                      }
                    >
                      {metric.badge
                        ? metric.badge
                        : metric.tone === 'success'
                        ? 'OK'
                        : metric.tone === 'danger'
                          ? 'Atención'
                          : 'Seguimiento'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Leyenda visual" description="Estados de marcadores y trazas del mapa.">
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" /> Disponible / idle ({statusCount.available})
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-400" /> En viaje / on_trip ({statusCount.onTrip})
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" /> Stale ({statusCount.stale})
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500" /> Viajes activos
                (marker/polilínea)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" /> Incidentes abiertos
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">Drivers en payload live: {drivers.length}</p>
            <p className="mt-2 text-xs text-slate-400">
              Última actualización: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '-'}
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
