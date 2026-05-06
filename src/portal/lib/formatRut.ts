// Format Chilean RUT into XX.XXX.XXX-V
export function formatRut(rut: string | null | undefined): string {
  if (!rut) return '—';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // group thousands
  const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped}-${dv}`;
}
