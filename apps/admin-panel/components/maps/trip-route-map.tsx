'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { DivIcon, LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type RoutePoint = { lat: number; lng: number };

const startIcon: DivIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#22c55e;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const endIcon: DivIcon = L.divIcon({
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

export function TripRouteMap({ pickup, dropoff, points }: { pickup?: RoutePoint; dropoff?: RoutePoint; points: RoutePoint[] }) {
  const polyline = points.map((point) => [point.lat, point.lng] as LatLngTuple);
  const center = polyline[0] ?? (pickup ? [pickup.lat, pickup.lng] : dropoff ? [dropoff.lat, dropoff.lng] : [-33.4592, -61.4832]);

  const boundsSource: LatLngTuple[] = [
    ...polyline,
    ...(pickup ? [[pickup.lat, pickup.lng] as LatLngTuple] : []),
    ...(dropoff ? [[dropoff.lat, dropoff.lng] as LatLngTuple] : []),
  ];

  return (
    <div className="h-[340px] overflow-hidden rounded-lg border border-slate-700">
      <MapContainer center={center as LatLngTuple} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {boundsSource.length > 0 && <FitBounds points={boundsSource} />}
        {polyline.length > 1 ? <Polyline positions={polyline} pathOptions={{ color: '#22d3ee', weight: 4 }} /> : null}
        {pickup ? <Marker position={[pickup.lat, pickup.lng]} icon={startIcon} /> : null}
        {dropoff ? <Marker position={[dropoff.lat, dropoff.lng]} icon={endIcon} /> : null}
      </MapContainer>
    </div>
  );
}
