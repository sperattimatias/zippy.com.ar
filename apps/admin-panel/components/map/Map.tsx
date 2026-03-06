'use client';

import type { ReactNode } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer as LeafletTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type MapProps = {
  center: [number, number];
  zoom?: number;
  className?: string;
  children?: ReactNode;
};

export function Map({ center, zoom = 13, className = 'h-full w-full', children }: MapProps) {
  const MapContainer = LeafletMapContainer as any;
  const TileLayer = LeafletTileLayer as any;

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
