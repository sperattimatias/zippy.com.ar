export type LatLngPoint = { lat: number; lng: number };

export const FIRMAT_BASE_POLYGON: LatLngPoint[] = [
  { lat: -33.4597, lng: -61.4832 },
  { lat: -33.4686, lng: -61.475 },
  { lat: -33.4744, lng: -61.487 },
  { lat: -33.4662, lng: -61.4976 },
  { lat: -33.4597, lng: -61.4832 },
];

export const ZONE_TYPES = {
  geozone: ['SAFE', 'CAUTION', 'RED'],
  premium: ['PREMIUM', 'EVENT', 'TERMINAL', 'HIGH_DEMAND'],
} as const;

export function isValidLatLng(point: LatLngPoint) {
  return point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180;
}
