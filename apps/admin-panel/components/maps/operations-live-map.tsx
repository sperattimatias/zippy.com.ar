'use client';

import { useEffect } from 'react';
import { Marker as LeafletMarker, Polyline as LeafletPolyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import { Map } from '../map/Map';

type Point = { lat: number; lng: number };

type TripPath = {
  id: string;
  points: Point[];
};

const driverIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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
  driverPoints,
  tripPaths,
}: {
  center: [number, number];
  driverPoints: Point[];
  tripPaths: TripPath[];
}) {
  const Marker = LeafletMarker as any;
  const Polyline = LeafletPolyline as any;
  const pathPoints = tripPaths.flatMap((path) => path.points);
  const boundsSource: Array<[number, number]> = [
    ...driverPoints.map((point) => [point.lat, point.lng] as [number, number]),
    ...pathPoints.map((point) => [point.lat, point.lng] as [number, number]),
  ];

  return (
    <div className="h-[560px] overflow-hidden rounded-lg border border-slate-700">
      <Map center={center} className="h-full w-full">
        {boundsSource.length > 0 ? <FitBounds points={boundsSource} /> : null}

        {driverPoints.map((point, index) => (
          <Marker key={`driver-${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]} icon={driverIcon} />
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
