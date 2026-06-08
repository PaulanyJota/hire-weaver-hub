// Orden geográfico oficial norte → sur. Única fuente de verdad para todo el portal.
// Cualquier listado de sucursales debe respetar este orden, independientemente
// del valor de otras columnas (monto, asistencia, trabajadores, etc.).

export const BRANCH_ORDER: Record<string, number> = {
  LC_LS: 1, // La Serena
  LC_AE: 2, // Aeropuerto SCL
  'LC_ÑU': 3, // Ñuñoa
  LC_NU: 3, // alias sin tilde
  LC_VT: 4, // Vitacura (código nuevo)
  LC_VI: 4, // Vitacura (alias antiguo en datos existentes)
  LC_VM: 5, // Viña del Mar
  LC_CO: 6, // Concepción
  LC_TE: 7, // Temuco
  LC_PM: 8, // Puerto Montt
  LC_PA: 9, // Punta Arenas
  LC_PN: 10, // Puerto Natales
};

export const BRANCH_NAMES: Record<string, string> = {
  LC_LS: 'La Serena',
  LC_AE: 'Aeropuerto SCL',
  'LC_ÑU': 'Ñuñoa',
  LC_NU: 'Ñuñoa',
  LC_VT: 'Vitacura',
  LC_VI: 'Vitacura',
  LC_VM: 'Viña del Mar',
  LC_CO: 'Concepción',
  LC_TE: 'Temuco',
  LC_PM: 'Puerto Montt',
  LC_PA: 'Punta Arenas',
  LC_PN: 'Puerto Natales',
};

/** Orden por nombre legible (norte → sur). */
const NAME_ORDER: Record<string, number> = {
  'La Serena': 1,
  'Aeropuerto SCL': 2,
  'Ñuñoa': 3,
  Vitacura: 4,
  'Viña del Mar': 5,
  Concepción: 6,
  Temuco: 7,
  'Puerto Montt': 8,
  'Punta Arenas': 9,
  'Puerto Natales': 10,
};

export function branchName(code: string | null | undefined): string {
  if (!code) return 'Sin sucursal';
  return BRANCH_NAMES[code] ?? code;
}

export function branchOrder(code: string | null | undefined): number {
  if (!code) return 99;
  return BRANCH_ORDER[code] ?? 99;
}

export function branchOrderByName(name: string | null | undefined): number {
  if (!name) return 99;
  return NAME_ORDER[name] ?? 99;
}

/** Ordena un arreglo cuyo campo `sucursal` puede ser código LC_* o nombre legible. */
export const sortByBranch = <T extends { sucursal: string | null | undefined }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => {
    const sa = a.sucursal ?? '';
    const sb = b.sucursal ?? '';
    const oa = BRANCH_ORDER[sa] ?? NAME_ORDER[sa] ?? 99;
    const ob = BRANCH_ORDER[sb] ?? NAME_ORDER[sb] ?? 99;
    return oa - ob;
  });
