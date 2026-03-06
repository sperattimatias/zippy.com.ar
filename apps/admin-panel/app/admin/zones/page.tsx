'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '../../../components/page/PageHeader';
import { EmptyState } from '../../../components/states/EmptyState';
import { ErrorState } from '../../../components/states/ErrorState';
import { TableSkeleton } from '../../../components/states/TableSkeleton';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { FIRMAT_BASE_POLYGON, isValidLatLng, ZONE_TYPES } from '../../../lib/zones';
import { toast } from '../../../lib/toast';
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

const tabButton = 'rounded-lg px-3 py-2 text-sm font-medium transition';

const LeafletPolygonEditor = dynamic(
  () => import('../../../components/maps/leaflet-polygon-editor').then((mod) => mod.LeafletPolygonEditor),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-lg border border-slate-700 bg-slate-900/70" /> },
);

function ZonesCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ZonesManager({ kind }: { kind: ZoneKind }) {
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ZoneRow | null>(null);

  const endpoint = kind === 'geozones' ? '/api/admin/geozones' : '/api/admin/premium-zones';

  const showError = (message: string) => toast.error(message);
  const showSuccess = (message: string) => toast.success(message);

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

    setSaveLoading(true);
    try {
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
    } finally {
      setSaveLoading(false);
    }
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

    setProfileLoading(true);
    try {
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
    } finally {
      setProfileLoading(false);
    }
  };

  const onToggle = async (row: ZoneRow) => {
    setActionLoadingId(`toggle-${row.id}`);
    try {
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
    } finally {
      setActionLoadingId(null);
    }
  };

  const onDelete = async (row: ZoneRow) => {
    setActionLoadingId(`delete-${row.id}`);
    try {
      const res = await fetch(`${endpoint}/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showError('No se pudo borrar');
        return;
      }

      showSuccess('Zona borrada');
      setDeleteTarget(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ZonesCard
        title={editing ? `Editar ${editing.name}` : `Nueva ${kind === 'geozones' ? 'GeoZone' : 'Premium Zone'}`}
        description="Definí polígonos y reglas para la zona seleccionada."
      >
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <p className="mb-2 text-sm font-medium">Pricing profiles</p>
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Nombre perfil" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            <Input type="number" placeholder="Base fare" value={profileBaseFare} onChange={(e) => setProfileBaseFare(Number(e.target.value))} />
            <Input type="number" placeholder="Per km" value={profilePerKm} onChange={(e) => setProfilePerKm(Number(e.target.value))} />
            <Input type="number" placeholder="Per min" value={profilePerMin} onChange={(e) => setProfilePerMin(Number(e.target.value))} />
            <Input type="number" placeholder="Minimum" value={profileMinimum} onChange={(e) => setProfileMinimum(Number(e.target.value))} />
            <Input type="number" placeholder="Cancel fee" value={profileCancelFee} onChange={(e) => setProfileCancelFee(Number(e.target.value))} />
            <Input type="number" step="0.1" placeholder="Surge" value={profileSurge} onChange={(e) => setProfileSurge(Number(e.target.value))} />
            <Input type="number" placeholder="Night fee" value={profileNightFee} onChange={(e) => setProfileNightFee(Number(e.target.value))} />
          </div>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void createPricingProfile()} disabled={profileLoading}>
            {profileLoading ? 'Guardando...' : 'Guardar perfil'}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {(kind === 'geozones' ? ZONE_TYPES.geozone : ZONE_TYPES.premium).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {kind === 'premium' && (
            <>
              <Input type="number" value={minDriverScore} onChange={(e) => setMinDriverScore(Number(e.target.value))} placeholder="Min driver score" />
              <Input type="number" value={minPassengerScore} onChange={(e) => setMinPassengerScore(Number(e.target.value))} placeholder="Min passenger score" />
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Activo
          </label>
          <Select value={pricingProfileKey} onChange={(e) => setPricingProfileKey(e.target.value)}>
            <option value="">Sin profile</option>
            {pricingProfiles.map((profile) => (
              <option key={profile.key} value={profile.key}>
                {profile.name} ({profile.key})
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-4">
          {loading ? <TableSkeleton rows={6} /> : <LeafletPolygonEditor points={points} onChange={setPoints} />}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPoints(FIRMAT_BASE_POLYGON)}>
            Firmat preset
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPoints([])}>
            Reset
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPoints(FIRMAT_BASE_POLYGON)}>
            Firmat preset
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPoints([])}>
            Reset
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={saveLoading}>
            {saveLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear zona'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={resetForm}>
              Cancelar edición
            </Button>
          )}
        </div>
      </ZonesCard>

      <ZonesCard title="Zonas existentes" description="Listado de zonas registradas con acciones rápidas.">
        {loading && <TableSkeleton rows={6} />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title="No hay zonas cargadas todavía" description="Creá una zona para comenzar a aplicar reglas geográficas y de pricing." />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>UpdatedAt</TableHead>
                  <TableHead>Pricing Profile</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.is_active ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="text-slate-400">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</TableCell>
                    <TableCell>{row.pricing_profile_key ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void onToggle(row)} disabled={actionLoadingId === `toggle-${row.id}`}>
                          {actionLoadingId === `toggle-${row.id}` ? 'Procesando...' : row.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={actionLoadingId === `delete-${row.id}`}>
                          {actionLoadingId === `delete-${row.id}` ? 'Borrando...' : 'Borrar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ZonesCard>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar zona</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Confirmá la eliminación de{' '}
              <span className="font-medium text-slate-200">{deleteTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                void onDelete(deleteTarget);
              }}
              disabled={deleteTarget ? actionLoadingId === `delete-${deleteTarget.id}` : false}
            >
              {deleteTarget && actionLoadingId === `delete-${deleteTarget.id}` ? 'Borrando...' : 'Confirmar borrado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <PageHeader title="Zones" subtitle="Administrá GeoZones y Premium Zones desde una misma pantalla." />

      <section className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
        <Button className={`${tabButton} ${tab === 'geozones' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`} variant="ghost" onClick={() => setTab('geozones')}>
          GeoZones
        </Button>
        <Button className={`${tabButton} ${tab === 'premium' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`} variant="ghost" onClick={() => setTab('premium')}>
          Premium Zones
        </Button>
      </section>

      <ZonesManager kind={tab} />
    </div>
  );
}
