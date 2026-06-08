// Helpers de período de pago vs período trabajado (Chile).
// En Chile, una liquidación pagada en el mes N corresponde al trabajo del mes N-1.
// Todos los displays al usuario deben mostrar el mes TRABAJADO.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Toma un período ISO ("YYYY-MM-DD" o "YYYY-MM") y devuelve nombre en español. No desfasa. */
export function fmtPeriodEs(p: string | null | undefined): string {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  const y = Number(ymd[0]); const m = Number(ymd[1]);
  if (!y || !m) return p;
  return `${MESES[m - 1]} ${y}`;
}

/** Devuelve el período trabajado (paid month - 1) formateado en español. */
export function shiftedPeriodEs(p: string | null | undefined): string {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  let y = Number(ymd[0]); let m = Number(ymd[1]);
  if (!y || !m) return p;
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${MESES[m - 1]} ${y}`;
}

/** Variante corta tipo "May 2026" → "Abr 2026". */
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export function shiftedPeriodEsShort(p: string | null | undefined): string {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  let y = Number(ymd[0]); let m = Number(ymd[1]);
  if (!y || !m) return p;
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${MESES_CORTOS[m - 1]} ${y}`;
}
