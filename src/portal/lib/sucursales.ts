export const SUCURSAL_MAP: Record<string, string> = {
  LC_AE: 'Aeropuerto SCL',
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

export function sucursalName(cc: string | null | undefined): string {
  if (!cc) return 'Sin sucursal';
  return SUCURSAL_MAP[cc] ?? cc;
}
