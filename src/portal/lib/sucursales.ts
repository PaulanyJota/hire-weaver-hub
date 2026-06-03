export const SUCURSAL_MAP: Record<string, string> = {
  LC_AE: 'Aeropuerto SCL',
  LC_VI: 'Vitacura',
  LC_CO: 'Concepción',
  LC_LS: 'La Serena',
  'LC_ÑU': 'Ñuñoa',
  LC_NU: 'Ñuñoa',
  LC_PA: 'Punta Arenas',
  LC_PM: 'Puerto Montt',
  LC_PN: 'Puerto Natales',
  LC_TE: 'Temuco',
  LC_VM: 'Viña del Mar',
  AL_MF: 'Maipú',
  AL_PU: 'Pudahuel',
};

// Orden geográfico de norte a sur — única fuente de verdad para todos los listados por sucursal.
export const SUCURSAL_ORDEN_GEO: string[] = [
  'LC_LS', // La Serena
  'LC_VM', // Viña del Mar
  'LC_AE', // Aeropuerto SCL
  'LC_VI', // Vitacura
  'LC_ÑU', // Ñuñoa
  'LC_NU', // Ñuñoa (alias)
  'LC_CO', // Concepción
  'LC_TE', // Temuco
  'LC_PM', // Puerto Montt
  'LC_PN', // Puerto Natales
  'LC_PA', // Punta Arenas
];

const NOMBRE_ORDEN_GEO: string[] = [
  'La Serena',
  'Viña del Mar',
  'Aeropuerto SCL',
  'Vitacura',
  'Ñuñoa',
  'Concepción',
  'Temuco',
  'Puerto Montt',
  'Puerto Natales',
  'Punta Arenas',
];

export function sucursalName(cc: string | null | undefined): string {
  if (!cc) return 'Sin sucursal';
  return SUCURSAL_MAP[cc] ?? cc;
}

/** Índice geográfico por código (cost_center). Desconocidos van al final. */
export function sucursalGeoIndex(cc: string | null | undefined): number {
  if (!cc) return 999;
  const i = SUCURSAL_ORDEN_GEO.indexOf(cc);
  return i === -1 ? 999 : i;
}

/** Índice geográfico por nombre de sucursal. Desconocidos van al final. */
export function sucursalGeoIndexByName(name: string | null | undefined): number {
  if (!name) return 999;
  const i = NOMBRE_ORDEN_GEO.indexOf(name);
  return i === -1 ? 999 : i;
}
