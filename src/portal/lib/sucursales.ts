// Compatibilidad histórica. La fuente de verdad para sucursales Lucano es
// `src/portal/constants/branches.ts`. Este archivo re-exporta los helpers
// y suma los códigos legacy de Alsacia (AL_*) que no participan del orden
// geográfico Lucano.

import {
  BRANCH_NAMES,
  BRANCH_ORDER,
  branchName,
  branchOrder,
  branchOrderByName,
} from '../constants/branches';

const LEGACY_MAP: Record<string, string> = {
  AL_MF: 'Maipú',
  AL_PU: 'Pudahuel',
};

export const SUCURSAL_MAP: Record<string, string> = {
  ...BRANCH_NAMES,
  ...LEGACY_MAP,
};

/** Orden geográfico de norte a sur — derivado de BRANCH_ORDER. */
export const SUCURSAL_ORDEN_GEO: string[] = Object.entries(BRANCH_ORDER)
  .sort((a, b) => a[1] - b[1])
  .map(([code]) => code);

export function sucursalName(cc: string | null | undefined): string {
  if (!cc) return 'Sin sucursal';
  return SUCURSAL_MAP[cc] ?? branchName(cc);
}

export function sucursalGeoIndex(cc: string | null | undefined): number {
  return branchOrder(cc);
}

export function sucursalGeoIndexByName(name: string | null | undefined): number {
  return branchOrderByName(name);
}
