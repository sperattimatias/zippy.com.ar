'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngPoint } from '../../lib/zones';
import { Button } from '../ui/button';

const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;background:#22d3ee;border:2px solid #0f172a;border-radius:9999px"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points as LatLngBoundsExpression, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

function ClickToAdd({ onAdd }: { onAdd: (point: LatLngPoint) => void }) {
  useMapEvents({
    click: (event) => {
      onAdd({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export function LeafletPolygonEditor({ points, onChange }: { points: LatLngPoint[]; onChange: (next: LatLngPoint[]) => void }) {
  const polygon = points.map((point) => [point.lat, point.lng] as LatLngTuple);
  const center = (polygon[0] ?? [-33.4592, -61.4832]) as LatLngExpression;

  const addPoint = () => {
    const last = points[points.length - 1] ?? { lat: -33.4592, lng: -61.4832 };
    onChange([...points, { lat: last.lat + 0.002, lng: last.lng + 0.002 }]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Click en el mapa para agregar puntos. Arrastrá cada punto para editar el polígono.</p>
      <div className="h-[340px] overflow-hidden rounded-lg border border-slate-700">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToAdd onAdd={(point) => onChange([...points, point])} />
          {polygon.length > 0 && <FitBounds points={polygon} />}
          {polygon.length >= 3 ? <Polygon positions={polygon} pathOptions={{ color: '#06b6d4', fillColor: '#0891b2', fillOpacity: 0.2 }} /> : null}
          {points.map((point, index) => (
            <Marker
              key={`${point.lat}-${point.lng}-${index}`}
              position={[point.lat, point.lng]}
              icon={vertexIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const latlng = event.target.getLatLng();
                  const next = [...points];
                  next[index] = { lat: latlng.lat, lng: latlng.lng };
                  onChange(next);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addPoint}>Agregar punto</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(points.length > 0 ? points.slice(0, points.length - 1) : points)}
        >
          Eliminar último
        </Button>
      </div>
    </div>
  );
}
