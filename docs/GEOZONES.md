# GEOZONES.md

## Formato esperado de `polygon_json`

Para MVP se usa un arreglo JSON de puntos `{lat, lng}`:

```json
[
  { "lat": -34.6, "lng": -58.41 },
  { "lat": -34.605, "lng": -58.42 },
  { "lat": -34.595, "lng": -58.43 },
  { "lat": -34.6, "lng": -58.41 }
]
```

## Validaciones

- mínimo 3 puntos (sin contar cierre)
- si el polígono no está cerrado, el servicio cierra automáticamente agregando el primer punto al final
- tipos: `SAFE`, `CAUTION`, `RED`
- endpoint CRUD protegido con RBAC `admin|sos`

> Nota: se almacena en JSONB para permitir migrar a GeoJSON estricto o PostGIS sin romper API.
