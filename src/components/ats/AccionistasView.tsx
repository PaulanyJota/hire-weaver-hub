import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const NAVY = '#1B3A5C';
const ORANGE = '#F97316';
const TEAL = '#1D9E75';

const fmtCLP = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return '$0';
  return '$' + Math.round(Number(n)).toLocaleString('es-CL');
};
const parseCLP = (s: string) => Number(String(s).replace(/[^\d]/g, '')) || 0;
const fmtFecha = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}`;
};

interface Resumen {
  prestamo_id: string;
  accionista_id: string;
  accionista_nombre: string;
  accionista_orden: number;
  fecha_prestamo: string;
  monto_capital: number;
  tasa_mensual: number;
  dia_pago: number;
  ultimo_pago_intereses: string | null;
  total_pagado_intereses: number;
  total_pagado_capital: number;
  capital_pendiente: number;
  meses_transcurridos: number;
  interes_acumulado: number;
  saldo_total_debe: number;
  proxima_fecha_pago: string;
}

interface Accionista { id: string; nombre_completo: string; }
interface PagoRow {
  id: string; prestamo_id: string; fecha_pago: string;
  monto_intereses: number; monto_capital: number; glosa: string | null;
  accionista_nombre?: string;
}

export const AccionistasView: React.FC = () => {
  const [rows, setRows] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionistas, setAccionistas] = useState<Accionista[]>([]);
  const [pagos, setPagos] = useState<PagoRow[]>([]);

  // modals
  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoTarget, setPagoTarget] = useState<Resumen | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: resumen, error }, { data: accs }, { data: pagosData }] = await Promise.all([
      supabase.rpc('get_prestamos_resumen'),
      supabase.from('accionistas').select('id, nombre_completo').eq('activo', true).order('orden'),
      supabase.from('pagos_accionistas').select('id, prestamo_id, fecha_pago, monto_intereses, monto_capital, glosa, prestamos_accionistas(accionista_id, accionistas(nombre_completo))').order('fecha_pago', { ascending: false }),
    ]);
    if (error) toast.error('Error cargando resumen: ' + error.message);
    setRows((resumen as Resumen[]) ?? []);
    setAccionistas((accs as Accionista[]) ?? []);
    setPagos(((pagosData as any[]) ?? []).map(p => ({
      id: p.id, prestamo_id: p.prestamo_id, fecha_pago: p.fecha_pago,
      monto_intereses: Number(p.monto_intereses), monto_capital: Number(p.monto_capital), glosa: p.glosa,
      accionista_nombre: p.prestamos_accionistas?.accionistas?.nombre_completo ?? '—',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totales = useMemo(() => {
    const cap = rows.reduce((s, r) => s + Number(r.monto_capital || 0), 0);
    const pendiente = rows.reduce((s, r) => s + Number(r.capital_pendiente || 0), 0);
    const interes = rows.reduce((s, r) => s + Number(r.interes_acumulado || 0), 0);
    const debe = rows.reduce((s, r) => s + Number(r.saldo_total_debe || 0), 0);
    return { cap, pendiente, interes, debe };
  }, [rows]);

  const updateField = async (prestamo_id: string, field: 'fecha_prestamo' | 'monto_capital' | 'tasa_mensual', value: any) => {
    const payload: Record<string, any> = { [field]: value };
    const { error } = await supabase
      .from('prestamos_accionistas')
      .update(payload as any)
      .eq('id', prestamo_id);
    if (error) { toast.error('No se pudo actualizar: ' + error.message); return; }
    toast.success('Actualizado');
    load();
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <header
        className="relative overflow-hidden rounded-2xl px-6 sm:px-8 py-7 text-white"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #3DA5E0 100%)` }}
      >
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-white/65 font-semibold">Finanzas · Financiamiento · Deuda Privada</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Préstamos de Accionistas</h1>
            <p className="text-sm text-white/80 mt-1.5">
              Total prestado: <span className="font-semibold">{fmtCLP(totales.cap)}</span>
              {' · '}Saldo pendiente: <span className="font-semibold">{fmtCLP(totales.debe)}</span>
              {' · '}Interés acumulado: <span className="font-semibold">{fmtCLP(totales.interes)}</span>
            </p>
          </div>
          <Button
            onClick={() => setNuevoOpen(true)}
            className="text-white font-semibold shadow-md hover:opacity-90"
            style={{ background: ORANGE }}
          >
            <Plus className="w-4 h-4 mr-1" /> Nuevo préstamo
          </Button>
        </div>
      </header>

      {/* TABLA */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: NAVY }}>Préstamos vigentes</h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Accionista</TableHead>
                <TableHead>Fecha préstamo</TableHead>
                <TableHead>Monto capital</TableHead>
                <TableHead className="w-24">Tasa %</TableHead>
                <TableHead className="text-right">Meses</TableHead>
                <TableHead className="text-right">Interés acum.</TableHead>
                <TableHead className="text-right">Capital pend.</TableHead>
                <TableHead className="text-right">Saldo total</TableHead>
                <TableHead>Próx. pago</TableHead>
                <TableHead className="text-center">Se le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={10} className="text-center text-slate-500 py-8">Sin préstamos registrados</TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.prestamo_id}>
                  <TableCell className="font-medium" style={{ color: NAVY }}>{r.accionista_nombre}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      defaultValue={r.fecha_prestamo}
                      className="h-8 w-36 text-xs"
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== r.fecha_prestamo) {
                          updateField(r.prestamo_id, 'fecha_prestamo', e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <CLPInput
                      value={Number(r.monto_capital)}
                      onCommit={(v) => { if (v !== Number(r.monto_capital)) updateField(r.prestamo_id, 'monto_capital', v); }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(r.tasa_mensual)}
                      className="h-8 w-20 text-xs tabular-nums"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v) && v !== Number(r.tasa_mensual)) {
                          updateField(r.prestamo_id, 'tasa_mensual', v);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{Number(r.meses_transcurridos).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtCLP(r.interes_acumulado)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtCLP(r.capital_pendiente)}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold" style={{ color: NAVY }}>{fmtCLP(r.saldo_total_debe)}</TableCell>
                  <TableCell className="text-xs">{fmtFecha(r.proxima_fecha_pago)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      className="text-white text-xs h-8 hover:opacity-90"
                      style={{ background: TEAL }}
                      onClick={() => { setPagoTarget(r); setPagoOpen(true); }}
                    >
                      Registrar pago
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* HISTORIAL collapsible por accionista */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Historial de pagos</h2>
        <HistorialPorAccionista pagos={pagos} />
      </div>

      <RegistrarPagoModal
        open={pagoOpen}
        onClose={() => { setPagoOpen(false); setPagoTarget(null); }}
        target={pagoTarget}
        onSaved={load}
      />
      <NuevoPrestamoModal
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        accionistas={accionistas}
        onSaved={load}
      />
    </div>
  );
};

// ----- CLP Input
const CLPInput: React.FC<{ value: number; onCommit: (v: number) => void }> = ({ value, onCommit }) => {
  const [v, setV] = useState(fmtCLP(value));
  useEffect(() => { setV(fmtCLP(value)); }, [value]);
  return (
    <Input
      value={v}
      className="h-8 w-32 text-xs tabular-nums"
      onChange={(e) => setV(fmtCLP(parseCLP(e.target.value)))}
      onBlur={() => onCommit(parseCLP(v))}
    />
  );
};

// ----- Modal Registrar Pago
const RegistrarPagoModal: React.FC<{
  open: boolean; onClose: () => void; target: Resumen | null; onSaved: () => void;
}> = ({ open, onClose, target, onSaved }) => {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [intereses, setIntereses] = useState(0);
  const [capital, setCapital] = useState(0);
  const [glosa, setGlosa] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setFecha(new Date().toISOString().slice(0, 10));
      setIntereses(Math.round(Number(target.interes_acumulado) || 0));
      setCapital(0);
      setGlosa('');
    }
  }, [target]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('pagos_accionistas').insert({
      prestamo_id: target.prestamo_id,
      fecha_pago: fecha,
      monto_intereses: intereses,
      monto_capital: capital,
      glosa: glosa || null,
      registrado_por: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Pago registrado');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>Registrar pago</DialogTitle>
        </DialogHeader>
        {target && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div><span className="text-slate-500">Accionista:</span> <span className="font-semibold">{target.accionista_nombre}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Capital pendiente:</span> <span className="tabular-nums">{fmtCLP(target.capital_pendiente)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Interés acumulado:</span> <span className="tabular-nums" style={{ color: TEAL }}>{fmtCLP(target.interes_acumulado)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha de pago</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Monto intereses</Label>
                <Input value={fmtCLP(intereses)} onChange={(e) => setIntereses(parseCLP(e.target.value))} className="tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Monto capital</Label>
                <Input value={fmtCLP(capital)} onChange={(e) => setCapital(parseCLP(e.target.value))} className="tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Total</Label>
                <Input readOnly value={fmtCLP(intereses + capital)} className="tabular-nums bg-slate-100 font-semibold" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Glosa (opcional)</Label>
              <Textarea rows={2} value={glosa} onChange={(e) => setGlosa(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="text-white" style={{ background: ORANGE }}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Guardar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----- Modal Nuevo Préstamo
const NuevoPrestamoModal: React.FC<{
  open: boolean; onClose: () => void; accionistas: Accionista[]; onSaved: () => void;
}> = ({ open, onClose, accionistas, onSaved }) => {
  const [accId, setAccId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState(0);
  const [tasa, setTasa] = useState(1.0);
  const [diaPago, setDiaPago] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAccId(''); setFecha(new Date().toISOString().slice(0, 10));
      setMonto(0); setTasa(1.0); setDiaPago(20);
    }
  }, [open]);

  const save = async () => {
    if (!accId || !monto) { toast.error('Selecciona accionista y monto'); return; }
    setSaving(true);
    const { error } = await supabase.from('prestamos_accionistas').insert({
      accionista_id: accId,
      fecha_prestamo: fecha,
      monto_capital: monto,
      tasa_mensual: tasa,
      dia_pago_intereses: diaPago,
    });
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Préstamo creado');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>Nuevo préstamo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Accionista</Label>
            <Select value={accId} onValueChange={setAccId}>
              <SelectTrigger><SelectValue placeholder="Selecciona accionista" /></SelectTrigger>
              <SelectContent>
                {accionistas.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha préstamo</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Día de pago</Label>
              <Input type="number" min={1} max={28} value={diaPago} onChange={(e) => setDiaPago(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Monto capital</Label>
              <Input value={fmtCLP(monto)} onChange={(e) => setMonto(parseCLP(e.target.value))} className="tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">Tasa mensual %</Label>
              <Input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="text-white" style={{ background: ORANGE }}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Crear préstamo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccionistasView;
