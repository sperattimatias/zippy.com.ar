'use client';

import { useEffect } from 'react';
import { Marker as LeafletMarker, Polyline as LeafletPolyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import { Map } from '../map/Map';

type RoutePoint = { lat: number; lng: number };

const startIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#22c55e;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const endIcon = L.divIcon({
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

export function TripRouteMap({ pickup, dropoff, points }: { pickup?: RoutePoint; dropoff?: RoutePoint; points: RoutePoint[] }) {
  const Marker = LeafletMarker as any;
  const Polyline = LeafletPolyline as any;
  const polyline = points.map((point) => [point.lat, point.lng] as [number, number]);
  const center = polyline[0] ?? (pickup ? [pickup.lat, pickup.lng] : dropoff ? [dropoff.lat, dropoff.lng] : [-33.4592, -61.4832]);

  const boundsSource: Array<[number, number]> = [
    ...polyline,
    ...(pickup ? [[pickup.lat, pickup.lng] as [number, number]] : []),
    ...(dropoff ? [[dropoff.lat, dropoff.lng] as [number, number]] : []),
  ];

  return (
    <div className="h-[340px] overflow-hidden rounded-lg border border-slate-700">
      <Map center={center as [number, number]} className="h-full w-full">
        {boundsSource.length > 0 && <FitBounds points={boundsSource} />}
        {polyline.length > 1 ? <Polyline positions={polyline} pathOptions={{ color: '#22d3ee', weight: 4 }} /> : null}
        {pickup ? <Marker position={[pickup.lat, pickup.lng]} icon={startIcon} /> : null}
        {dropoff ? <Marker position={[dropoff.lat, dropoff.lng]} icon={endIcon} /> : null}
      </Map>
    </div>
  );
}
