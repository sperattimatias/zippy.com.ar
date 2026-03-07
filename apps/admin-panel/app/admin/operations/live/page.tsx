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
type OperationalStatus = 'available' | 'on_trip' | 'stale';

type DriverMapMarker = Point & {
  driverId: string;
  operationalStatus: OperationalStatus;
  onTrip: boolean;
};

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

type OperationsLiveStats = {
  onlineDrivers: number;
  availableDrivers: number;
  busyDrivers: number;
  activeTrips: number;
  openIncidents: number;
};

type TripSummary = {
  id: string;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
};

type SafetyIncident = { id: string };

type OperationsSnapshotPayload = {
  generatedAt: string;
  drivers: LiveDriver[];
  activeTrips: TripSummary[];
  incidents: SafetyIncident[];
  stats: OperationsLiveStats;
};

type TripPath = {
  id: string;
  points: Point[];
};

const FIRMA_CENTER: [number, number] = [-33.4592, -61.4832];
const REFRESH_MS = 15_000;

const emptyStats: OperationsLiveStats = {
  onlineDrivers: 0,
  availableDrivers: 0,
  busyDrivers: 0,
  activeTrips: 0,
  openIncidents: 0,
};

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

function OperationsStats({ stats }: { stats: OperationsLiveStats }) {
  const items = [
    { label: 'Conductores online', value: stats.onlineDrivers, tone: 'success' as const, badge: 'Live' },
    { label: 'Conductores disponibles', value: stats.availableDrivers, tone: 'success' as const, badge: 'Idle' },
    { label: 'Conductores ocupados', value: stats.busyDrivers, tone: 'warning' as const, badge: 'On trip' },
    { label: 'Viajes activos', value: stats.activeTrips, tone: 'warning' as const },
    { label: 'Incidentes abiertos', value: stats.openIncidents, tone: 'danger' as const },
  ];

  return (
    <SectionCard title="Métricas operativas" description="Estado actual consolidado del snapshot en vivo.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold">{metric.value}</p>
              <Badge
                variant={
                  metric.tone === 'success' ? 'success' : metric.tone === 'danger' ? 'danger' : 'outline'
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
  );
}

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

function parseTripSummary(value: unknown): TripSummary | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== 'string') return null;

  return {
    id: record.id,
    origin_lat: asNumber(record.origin_lat),
    origin_lng: asNumber(record.origin_lng),
    dest_lat: asNumber(record.dest_lat),
    dest_lng: asNumber(record.dest_lng),
  };
}

function parseSafetyIncident(value: unknown): SafetyIncident | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== 'string') return null;
  return { id: record.id };
}

function isOperationsLiveStats(value: unknown): value is OperationsLiveStats {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.onlineDrivers === 'number' &&
    typeof record.availableDrivers === 'number' &&
    typeof record.busyDrivers === 'number' &&
    typeof record.activeTrips === 'number' &&
    typeof record.openIncidents === 'number'
  );
}

function parseOperationsSnapshot(payload: unknown): OperationsSnapshotPayload {
  const record = asRecord(payload);
  if (!record) {
    return {
      generatedAt: new Date().toISOString(),
      drivers: [],
      activeTrips: [],
      incidents: [],
      stats: emptyStats,
    };
  }

  const drivers = asArray<unknown>(record.drivers).filter(isLiveDriver);
  const activeTrips = asArray<unknown>(record.activeTrips)
    .map(parseTripSummary)
    .filter(Boolean) as TripSummary[];
  const incidents = asArray<unknown>(record.incidents)
    .map(parseSafetyIncident)
    .filter(Boolean) as SafetyIncident[];

  const stats = isOperationsLiveStats(record.stats)
    ? record.stats
    : {
        onlineDrivers: drivers.length,
        availableDrivers: drivers.filter((driver) => !driver.onTrip).length,
        busyDrivers: drivers.filter((driver) => driver.onTrip).length,
        activeTrips: activeTrips.length,
        openIncidents: incidents.length,
      };

  return {
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString(),
    drivers,
    activeTrips,
    incidents,
    stats,
  };
}

function toTripPath(trip: TripSummary): TripPath {
  const points: Point[] = [];
  if (trip.origin_lat != null && trip.origin_lng != null) {
    points.push({ lat: trip.origin_lat, lng: trip.origin_lng });
  }
  if (trip.dest_lat != null && trip.dest_lng != null) {
    points.push({ lat: trip.dest_lat, lng: trip.dest_lng });
  }
  return { id: trip.id, points };
}

export default function AdminOperationsLivePage() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [driverMarkers, setDriverMarkers] = useState<DriverMapMarker[]>([]);
  const [tripPaths, setTripPaths] = useState<TripPath[]>([]);
  const [openIncidents, setOpenIncidents] = useState(0);
  const [stats, setStats] = useState<OperationsLiveStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/admin/operations/live', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar el snapshot operativo.');

      const payload = parseOperationsSnapshot(await response.json());

      setDrivers(payload.drivers);
      setDriverMarkers(
        payload.drivers.map((driver) => ({
          driverId: driver.driverId,
          lat: driver.lat,
          lng: driver.lng,
          operationalStatus: driver.operationalStatus,
          onTrip: driver.onTrip,
        })),
      );
      setTripPaths(payload.activeTrips.map(toTripPath).filter((trip) => trip.points.length > 0));
      setOpenIncidents(payload.incidents.length);
      setStats(payload.stats);
      setLastUpdatedAt(payload.generatedAt);
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

  const hasPositions = driverMarkers.length > 0 || tripPaths.length > 0;
  const statusCount = useMemo(
    () => ({
      available: drivers.filter((driver) => driver.operationalStatus === 'available').length,
      onTrip: drivers.filter((driver) => driver.onTrip).length,
      stale: drivers.filter((driver) => driver.operationalStatus === 'stale').length,
    }),
    [drivers],
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

      <OperationsStats stats={stats} />

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
              <span className="h-3 w-3 rounded-full bg-rose-500" /> Incidentes abiertos ({openIncidents})
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">Drivers en payload live: {drivers.length}</p>
          <p className="mt-2 text-xs text-slate-400">
            Última actualización: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '-'}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
