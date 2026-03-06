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

type DriverRow = Record<string, unknown>;
type LiveDriversPayload = { drivers?: DriverRow[]; stats?: Record<string, unknown> };
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

function parseDriverPoint(driver: DriverRow) {
  const nestedCandidates = [
    driver.last_location,
    driver.current_location,
    driver.position,
    driver.location,
  ];
  for (const candidate of nestedCandidates) {
    const point = parsePoint(candidate);
    if (point) return point;
  }

  const lat = asNumber(driver.last_lat ?? driver.lat ?? driver.current_lat);
  const lng = asNumber(driver.last_lng ?? driver.lng ?? driver.current_lng);

  if (lat == null || lng == null) return null;

  return { lat, lng };
}

function extractItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  const items = record.items;
  if (Array.isArray(items)) return items;
  return [];
}

export default function AdminOperationsLivePage() {
  const [driverPoints, setDriverPoints] = useState<Point[]>([]);
  const [tripPaths, setTripPaths] = useState<TripPath[]>([]);
  const [openIncidents, setOpenIncidents] = useState(0);
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

      const liveDriversPayload = asRecord(driversPayload) as LiveDriversPayload | null;
      const drivers = Array.isArray(liveDriversPayload?.drivers)
        ? (liveDriversPayload?.drivers as DriverRow[])
        : (extractItems(driversPayload) as DriverRow[]);
      const trips = extractItems(tripsPayload) as TripRow[];
      const incidents = extractItems(incidentsPayload);

      const onlineDrivers = drivers.filter((driver) => driver.isOnline !== false);

      const points = onlineDrivers.map(parseDriverPoint).filter(Boolean) as Point[];
      const paths = trips
        .map((trip, index) => {
          const id = String(trip.id ?? `trip-${index}`);
          const pathPoints = parseTripPoints(trip);
          return { id, points: pathPoints };
        })
        .filter((trip) => trip.points.length > 0);

      setDriverPoints(points);
      setTripPaths(paths);
      setOpenIncidents(incidents.length);
      setLastUpdatedAt(new Date().toISOString());
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
  const onlineDrivers = driverPoints.length;
  const hasPositions = onlineDrivers > 0 || activeTrips > 0;

  const metrics = useMemo(
    () => [
      { label: 'Conductores online', value: onlineDrivers, tone: 'success' as const },
      { label: 'Viajes activos', value: activeTrips, tone: 'warning' as const },
      { label: 'Incidentes abiertos', value: openIncidents, tone: 'danger' as const },
    ],
    [activeTrips, onlineDrivers, openIncidents],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="Operación en tiempo real"
        subtitle="Monitoreo en tiempo real de conductores, viajes e incidentes en Firmat."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Refresh automático: 15s</Badge>
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
          description="Marcadores azules: conductores online. Trazas naranjas: viajes activos."
        >
          {loading ? <LoadingState message="Cargando posiciones en tiempo real..." /> : null}
          {!loading && error ? <ErrorState message={error} retry={() => void load()} /> : null}
          {!loading && !error && !hasPositions ? (
            <EmptyState
              title="Sin posiciones disponibles"
              description="No hay coordenadas activas para mostrar en este momento."
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
              driverPoints={driverPoints}
              tripPaths={tripPaths}
            />
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Métricas rápidas" description="Monitoreo operativo actual.">
            <div className="space-y-3">
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
                      {metric.tone === 'success'
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

          <SectionCard title="Leyenda visual">
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" /> Conductores online
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500" /> Viajes activos
                (marker/polilínea)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" /> Incidentes abiertos
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Última actualización: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '-'}
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
