'use client';

import { useEffect } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import type { DivIcon, LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';

import { Map } from '../map/Map';

type Point = { lat: number; lng: number };

type TripPath = {
  id: string;
  points: Point[];
};

const driverIcon: DivIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const tripIcon: DivIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#f97316;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points as LatLngBoundsExpression, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export function OperationsLiveMap({
  center,
  driverPoints,
  tripPaths,
}: {
  center: LatLngTuple;
  driverPoints: Point[];
  tripPaths: TripPath[];
}) {
  const pathPoints = tripPaths.flatMap((path) => path.points);
  const boundsSource: LatLngTuple[] = [
    ...driverPoints.map((point) => [point.lat, point.lng] as LatLngTuple),
    ...pathPoints.map((point) => [point.lat, point.lng] as LatLngTuple),
  ];

  return (
    <div className="h-[560px] overflow-hidden rounded-lg border border-slate-700">
      <Map center={center} className="h-full w-full">
        {boundsSource.length > 0 ? <FitBounds points={boundsSource} /> : null}

        {driverPoints.map((point, index) => (
          <Marker key={`driver-${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]} icon={driverIcon} />
        ))}

        {tripPaths.map((path) => {
          const positions = path.points.map((point) => [point.lat, point.lng] as LatLngTuple);

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
