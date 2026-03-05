'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../components/admin/ui';
import { FIRMAT_BASE_POLYGON, isValidLatLng, ZONE_TYPES } from '../../../lib/zones';
import type { LatLngPoint } from '../../../lib/zones';

type ZoneKind = 'geozones' | 'premium';

type ZoneRow = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  polygon_json: LatLngPoint[];
  updated_at?: string;
  min_driver_score?: number;
  min_passenger_score?: number;
  pricing_profile_key?: string | null;
};

type PricingProfile = {
  key: string;
  name: string;
  base_fare: number;
  per_km: number;
  per_min: number;
  minimum: number;
  cancel_fee: number;
  surge: number;
  night_fee?: number;
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

const tabButton = 'rounded-lg px-3 py-2 text-sm font-medium transition';

function PolygonEditor({ points, onChange }: { points: LatLngPoint[]; onChange: (next: LatLngPoint[]) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const bounds = useMemo(() => {
    const source = points.length > 0 ? points : FIRMAT_BASE_POLYGON;
    const lats = source.map((p) => p.lat);
    const lngs = source.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.01,
      maxLat: Math.max(...lats) + 0.01,
      minLng: Math.min(...lngs) - 0.01,
      maxLng: Math.max(...lngs) + 0.01,
    };
  }, [points]);

  const width = 560;
  const height = 320;

  const toXY = (point: LatLngPoint) => ({
    x: ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * width,
    y: ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat || 1)) * height,
  });

  const toLatLng = (x: number, y: number): LatLngPoint => ({
    lng: bounds.minLng + (x / width) * (bounds.maxLng - bounds.minLng),
    lat: bounds.maxLat - (y / height) * (bounds.maxLat - bounds.minLat),
  });

  const onCanvasClick = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onChange([...points, toLatLng(x, y)]);
  };

  const movePoint = (event: MouseEvent<SVGCircleElement>, index: number) => {
    if (selected !== index) return;
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(height, event.clientY - rect.top));
    const next = [...points];
    next[index] = toLatLng(x, y);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Editor de polígono: click para agregar puntos, arrastrá para mover.</p>
      <div className="h-[340px] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
      <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} onClick={onCanvasClick}>
        <rect width={width} height={height} fill="#020617" />
        <g opacity={0.18}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h-${i}`} x1={0} x2={width} y1={(height / 8) * i} y2={(height / 8) * i} stroke="#64748b" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v-${i}`} y1={0} y2={height} x1={(width / 12) * i} x2={(width / 12) * i} stroke="#64748b" />
          ))}
        </g>
        {points.length > 2 && <polygon points={points.map((p) => `${toXY(p).x},${toXY(p).y}`).join(' ')} fill="#0891b233" stroke="#06b6d4" strokeWidth={2} />}
        {points.map((point, index) => {
          const { x, y } = toXY(point);
          return (
            <circle
              key={`${point.lat}-${point.lng}-${index}`}
              cx={x}
              cy={y}
              r={6}
              fill={selected === index ? '#22d3ee' : '#f8fafc'}
              stroke="#0f172a"
              strokeWidth={2}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelected(index);
              }}
              onMouseMove={(e) => movePoint(e, index)}
              onMouseUp={() => setSelected(null)}
              onMouseLeave={() => setSelected(null)}
            />
          );
        })}
      </svg>
      </div>
      <div className="flex gap-2">
        <button className="rounded bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700" onClick={() => onChange(FIRMAT_BASE_POLYGON)}>
          Firmat preset
        </button>
        <button className="rounded bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700" onClick={() => onChange([])}>
          Reset
        </button>
        <button
          className="rounded bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
          onClick={() => onChange(points.length > 0 ? points.slice(0, points.length - 1) : points)}
        >
          Deshacer punto
        </button>
      </div>
    </div>
  );
}

function ZonesManager({ kind }: { kind: ZoneKind }) {
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState((kind === 'geozones' ? ZONE_TYPES.geozone[0] : ZONE_TYPES.premium[0]) as string);
  const [isActive, setIsActive] = useState(true);
  const [points, setPoints] = useState<LatLngPoint[]>([]);
  const [minDriverScore, setMinDriverScore] = useState(75);
  const [minPassengerScore, setMinPassengerScore] = useState(60);
  const [pricingProfiles, setPricingProfiles] = useState<PricingProfile[]>([]);
  const [pricingProfileKey, setPricingProfileKey] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBaseFare, setProfileBaseFare] = useState(800);
  const [profilePerKm, setProfilePerKm] = useState(250);
  const [profilePerMin, setProfilePerMin] = useState(80);
  const [profileMinimum, setProfileMinimum] = useState(1200);
  const [profileCancelFee, setProfileCancelFee] = useState(500);
  const [profileSurge, setProfileSurge] = useState(1);
  const [profileNightFee, setProfileNightFee] = useState(0);

  const endpoint = kind === 'geozones' ? '/api/admin/geozones' : '/api/admin/premium-zones';

  const showError = (message: string) => setToast({ tone: 'error', message });
  const showSuccess = (message: string) => setToast({ tone: 'success', message });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo obtener zonas');
      setRows(await res.json());

      const profilesRes = await fetch('/api/admin/pricing/profiles', { cache: 'no-store' });
      if (profilesRes.ok) setPricingProfiles(await profilesRes.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [endpoint]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setType((kind === 'geozones' ? ZONE_TYPES.geozone[0] : ZONE_TYPES.premium[0]) as string);
    setIsActive(true);
    setPoints([]);
    setMinDriverScore(75);
    setMinPassengerScore(60);
    setPricingProfileKey('');
  };

  const validate = () => {
    if (!name.trim()) return 'El nombre es obligatorio';
    if (points.length < 3) return 'El polígono debe tener al menos 3 puntos';
    if (points.some((point) => !isValidLatLng(point))) return 'Lat/Lng fuera de rango';
    return null;
  };

  const onSave = async () => {
    const validationError = validate();
    if (validationError) {
      showError(validationError);
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      is_active: isActive,
      polygon_json: points,
    };

    if (kind === 'premium') {
      payload.min_driver_score = minDriverScore;
      payload.min_passenger_score = minPassengerScore;
    }
    payload.pricing_profile_key = pricingProfileKey || undefined;

    const url = editing ? `${endpoint}/${editing.id}` : endpoint;
    const method = editing ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showError('No se pudo guardar la zona');
      return;
    }

    showSuccess(editing ? 'Zona actualizada' : 'Zona creada');
    resetForm();
    await load();
  };

  const onEdit = (row: ZoneRow) => {
    setEditing(row);
    setName(row.name);
    setType(row.type);
    setIsActive(row.is_active);
    setPoints(row.polygon_json ?? []);
    setMinDriverScore(row.min_driver_score ?? 75);
    setMinPassengerScore(row.min_passenger_score ?? 60);
    setPricingProfileKey(row.pricing_profile_key ?? '');
  };

  const createPricingProfile = async () => {
    const key = profileName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) {
      showError('Nombre de perfil requerido');
      return;
    }
    const res = await fetch('/api/admin/pricing/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key,
        name: profileName.trim(),
        base_fare: profileBaseFare,
        per_km: profilePerKm,
        per_min: profilePerMin,
        minimum: profileMinimum,
        cancel_fee: profileCancelFee,
        surge: profileSurge,
        night_fee: profileNightFee,
      }),
    });
    if (!res.ok) {
      showError('No se pudo crear perfil');
      return;
    }
    showSuccess('Perfil de pricing guardado');
    setProfileName('');
    await load();
  };

  const onToggle = async (row: ZoneRow) => {
    const res = await fetch(`${endpoint}/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    });

    if (!res.ok) {
      showError('No se pudo cambiar estado');
      return;
    }

    showSuccess(`Zona ${row.is_active ? 'desactivada' : 'activada'}`);
    await load();
  };

  const onDelete = async (row: ZoneRow) => {
    if (!window.confirm(`¿Borrar zona ${row.name}?`)) return;
    const res = await fetch(`${endpoint}/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      showError('No se pudo borrar');
      return;
    }

    showSuccess('Zona borrada');
    await load();
  };

  return (
    <div className="space-y-6">
      <AdminCard title={editing ? `Editar ${editing.name}` : `Nueva ${kind === 'geozones' ? 'GeoZone' : 'Premium Zone'}`}>
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <p className="mb-2 text-sm font-medium">Pricing profiles</p>
          <div className="grid gap-2 md:grid-cols-4">
            <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Nombre perfil" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Base fare" value={profileBaseFare} onChange={(e) => setProfileBaseFare(Number(e.target.value))} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Per km" value={profilePerKm} onChange={(e) => setProfilePerKm(Number(e.target.value))} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Per min" value={profilePerMin} onChange={(e) => setProfilePerMin(Number(e.target.value))} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Minimum" value={profileMinimum} onChange={(e) => setProfileMinimum(Number(e.target.value))} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Cancel fee" value={profileCancelFee} onChange={(e) => setProfileCancelFee(Number(e.target.value))} />
            <input type="number" step="0.1" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Surge" value={profileSurge} onChange={(e) => setProfileSurge(Number(e.target.value))} />
            <input type="number" className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Night fee" value={profileNightFee} onChange={(e) => setProfileNightFee(Number(e.target.value))} />
          </div>
          <button className="mt-2 rounded bg-slate-700 px-3 py-1.5 text-xs" onClick={() => void createPricingProfile()}>Guardar perfil</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {(kind === 'geozones' ? ZONE_TYPES.geozone : ZONE_TYPES.premium).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {kind === 'premium' && (
            <>
              <input
                type="number"
                className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
                value={minDriverScore}
                onChange={(e) => setMinDriverScore(Number(e.target.value))}
                placeholder="Min driver score"
              />
              <input
                type="number"
                className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
                value={minPassengerScore}
                onChange={(e) => setMinPassengerScore(Number(e.target.value))}
                placeholder="Min passenger score"
              />
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Activo
          </label>
          <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={pricingProfileKey} onChange={(e) => setPricingProfileKey(e.target.value)}>
            <option value="">Sin profile</option>
            {pricingProfiles.map((profile) => (
              <option key={profile.key} value={profile.key}>{profile.name} ({profile.key})</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-[340px] animate-pulse rounded-lg border border-slate-700 bg-slate-900/70" />
          ) : (
            <PolygonEditor points={points} onChange={setPoints} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500" onClick={onSave}>
            {editing ? 'Guardar cambios' : 'Crear zona'}
          </button>
          {editing && (
            <button className="rounded bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Zonas existentes">
        {loading && <LoadingState message="Cargando zonas..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay zonas cargadas todavía." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Activo</th>
                  <th className="p-2">UpdatedAt</th>
                  <th className="p-2">Pricing Profile</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/80">
                    <td className="p-2 font-medium text-slate-100">{row.name}</td>
                    <td className="p-2 text-slate-300">{row.type}</td>
                    <td className="p-2">{row.is_active ? 'Sí' : 'No'}</td>
                    <td className="p-2 text-slate-400">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                    <td className="p-2 text-slate-300">{row.pricing_profile_key ?? '-'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700" onClick={() => onEdit(row)}>
                          Editar
                        </button>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700" onClick={() => void onToggle(row)}>
                          {row.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500" onClick={() => void onDelete(row)}>
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function ZonesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'premium' ? 'premium' : 'geozones';
  const [tab, setTab] = useState<ZoneKind>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Zones</h1>
        <p className="text-sm text-slate-400">Administrá GeoZones y Premium Zones desde una misma pantalla.</p>
      </section>

      <section className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
        <button className={`${tabButton} ${tab === 'geozones' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`} onClick={() => setTab('geozones')}>
          GeoZones
        </button>
        <button className={`${tabButton} ${tab === 'premium' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`} onClick={() => setTab('premium')}>
          Premium Zones
        </button>
      </section>

      <ZonesManager kind={tab} />
    </div>
  );
}
