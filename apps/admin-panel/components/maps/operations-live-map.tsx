'use client';

import { useEffect } from 'react';
import { Marker as LeafletMarker, Polyline as LeafletPolyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import { Map } from '../map/Map';

type Point = { lat: number; lng: number };
type OperationalStatus = 'available' | 'on_trip' | 'stale';
type DriverMapMarker = Point & {
  driverId: string;
  operationalStatus: OperationalStatus;
  onTrip: boolean;
};

type TripPath = {
  id: string;
  points: Point[];
};

function buildDriverIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #0f172a;border-radius:9999px;box-shadow:0 0 0 2px rgba(15,23,42,0.45)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const driverIcons: Record<OperationalStatus, ReturnType<typeof L.divIcon>> = {
  available: buildDriverIcon('#34d399'),
  on_trip: buildDriverIcon('#22d3ee'),
  stale: buildDriverIcon('#fbbf24'),
};

const tripIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#f97316;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points as [number, number][], { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export function OperationsLiveMap({
  center,
  driverMarkers,
  tripPaths,
}: {
  center: [number, number];
  driverMarkers: DriverMapMarker[];
  tripPaths: TripPath[];
}) {
  const Marker = LeafletMarker as any;
  const Polyline = LeafletPolyline as any;
  const pathPoints = tripPaths.flatMap((path) => path.points);
  const boundsSource: Array<[number, number]> = [
    ...driverMarkers.map((point) => [point.lat, point.lng] as [number, number]),
    ...pathPoints.map((point) => [point.lat, point.lng] as [number, number]),
  ];

  return (
    <div className="h-[560px] overflow-hidden rounded-lg border border-slate-700">
      <Map center={center} className="h-full w-full">
        {boundsSource.length > 0 ? <FitBounds points={boundsSource} /> : null}

        {driverMarkers.map((driver, index) => (
          <Marker
            key={`driver-${driver.driverId}-${driver.lat}-${driver.lng}-${index}`}
            position={[driver.lat, driver.lng]}
            icon={driverIcons[driver.operationalStatus]}
          />
        ))}

        {tripPaths.map((path) => {
          const positions = path.points.map((point) => [point.lat, point.lng] as [number, number]);

          if (positions.length > 1) {
            return <Polyline key={`trip-path-${path.id}`} positions={positions} pathOptions={{ color: '#f97316', weight: 4 }} />;
          }

          if (positions.length === 1) {
            return <Marker key={`trip-point-${path.id}`} position={positions[0]} icon={tripIcon} />;
          }

          return null;
        })}
      </Map>
    </div>
  );
}
