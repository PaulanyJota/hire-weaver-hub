/**
 * Maps vacante_origen strings to client names based on business rules.
 * 
 * Rules:
 * - Ejecutivo Counter*, Movilizador Lavador*, Jefe de Central de Reservas → Lucano
 * - Operario Bodega*, Operario de Producción*, Operario Producción*, Gruero Horquilla*, 
 *   Supervisor de Línea*, Operario de Inventario* → Alval
 * - Operario Limpieza* → Daniel Achondo
 * - Everything else → Sin cliente asignado
 */

const RULES: { pattern: RegExp; cliente: string }[] = [
  { pattern: /^Ejecutivo Counter/i, cliente: 'Lucano Rent a Car' },
  { pattern: /^Movilizador Lavador/i, cliente: 'Lucano Rent a Car' },
  { pattern: /^Jefe de Central de Reservas/i, cliente: 'Lucano Rent a Car' },
  { pattern: /Pudahuel/i, cliente: 'Alval' },
  { pattern: /^Operario Bodega/i, cliente: 'Alval' },
  { pattern: /^Operario de Producci[oó]n/i, cliente: 'Alval' },
  { pattern: /^Operario Producci[oó]n/i, cliente: 'Alval' },
  { pattern: /^Supervisor de L[ií]nea/i, cliente: 'Alval' },
  { pattern: /^Analista de Inventario/i, cliente: 'Todo Espacio' },
  { pattern: /^Gruero Horquilla y Picking/i, cliente: 'Todo Espacio' },
  { pattern: /^Gruero Horquilla/i, cliente: 'Alval' },
  { pattern: /^Operario de Inventario/i, cliente: 'Alval' },
  { pattern: /^Operario Limpieza/i, cliente: 'Daniel Achondo' },
];

// Runtime overrides (added via UI, persist in memory for the session)
const runtimeOverrides: Map<string, string> = new Map();

export function addClienteOverride(cargoPrefix: string, clienteName: string) {
  runtimeOverrides.set(cargoPrefix.toLowerCase(), clienteName);
}

export function getClienteForVacante(vacanteOrigen: string | null): string {
  if (!vacanteOrigen) return 'Sin cliente';
  // Check runtime overrides first
  const lower = vacanteOrigen.toLowerCase();
  for (const [prefix, cliente] of runtimeOverrides) {
    if (lower.startsWith(prefix)) return cliente;
  }
  for (const rule of RULES) {
    if (rule.pattern.test(vacanteOrigen)) return rule.cliente;
  }
  return 'Sin cliente';
}

/** Check if a vacante_origen is a real job posting (not a notification/system email) */
export function isRealVacante(vacanteOrigen: string | null): boolean {
  if (!vacanteOrigen) return false;
  const noise = [
    /^\[Notificacion\]/i,
    /^\[Obtén mas Postulantes\]/i,
    /^Anuncio destacado/i,
    /^Fwd:/i,
    /^Re:/i,
    /^Nueva Clave/i,
    /^Resumen semanal/i,
    /^Aviso de pago/i,
    /^API$/i,
  ];
  return !noise.some(r => r.test(vacanteOrigen));
}
