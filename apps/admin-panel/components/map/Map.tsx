'use client';

import type { ReactNode } from 'react';
import type { LatLngExpression } from 'leaflet';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type MapProps = {
  center: LatLngExpression;
  zoom?: number;
  className?: string;
  children?: ReactNode;
};

export function Map({ center, zoom = 13, className = 'h-full w-full', children }: MapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
