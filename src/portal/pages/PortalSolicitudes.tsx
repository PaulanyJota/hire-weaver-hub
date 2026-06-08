import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { BRANCH_NAMES, BRANCH_ORDER } from '../constants/branches';
import {
  FileText, Receipt, FileSignature, BadgeDollarSign, HeartPulse, FilePlus2,
  X, Search, Loader2, Clock3, CheckCircle2, AlertCircle,
} from 'lucide-react';

type SolicitudType = 'f30' | 'liquidacion' | 'contrato' | 'remuneraciones' | 'accidente' | 'otro';

interface RequestRow {
  id: string;
  doc_type: string | null;
  doc_label: string | null;
  scope: string | null;
  scope_label: string | null;
  requestor_name: string | null;
  reason: string | null;
  periods: string[] | null;
  format: string | null;
  status: string;
  submitted_at: string;
  details: any;
}

const TYPES: Array<{
  key: SolicitudType;
  label: string;
  emoji: string;
  desc: string;
  icon: any;
}> = [
  { key: 'f30', label: 'F-30', emoji: '📄', desc: 'Certificado de antecedentes laborales para uno o más trabajadores', icon: FileText },
  { key: 'liquidacion', label: 'Liquidaciones de sueldo', emoji: '💰', desc: 'Solicitar liquidaciones de uno o más períodos', icon: Receipt },
  { key: 'contrato', label: 'Contrato de trabajo', emoji: '📋', desc: 'Copia del contrato vigente o histórico', icon: FileSignature },
  { key: 'remuneraciones', label: 'Certificado de remuneraciones', emoji: '📊', desc: 'Para trámites bancarios, hipotecarios, arriendo, etc.', icon: BadgeDollarSign },
  { key: 'accidente', label: 'Certificado de accidente laboral', emoji: '🏥', desc: 'Certificado de un incidente o accidente del trabajo', icon: HeartPulse },
  { key: 'otro', label: 'Otros documentos', emoji: '📝', desc: 'Indica qué documento necesitas', icon: FilePlus2 },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPES.map(t => [t.key, t.label]));

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: 'Pendiente', bg: 'rgba(249,115,22,0.12)', color: '#C2410C' },
  en_proceso: { label: 'En proceso', bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8' },
  completada: { label: 'Completada', bg: 'rgba(34,197,94,0.12)', color: '#15803D' },
  aprobada: { label: 'Completada', bg: 'rgba(34,197,94,0.12)', color: '#15803D' },
  rechazada: { label: 'Rechazada', bg: 'rgba(239,68,68,0.12)', color: '#B91C1C' },
  cancelada: { label: 'Cancelada', bg: 'rgba(148,163,184,0.15)', color: '#475569' },
};

const BRANCH_OPTIONS = Object.entries(BRANCH_ORDER)
  .filter(([code]) => !['LC_NU', 'LC_VI'].includes(code))
  .sort((a, b) => a[1] - b[1])
  .map(([code]) => ({ code, name: BRANCH_NAMES[code] }));

const DEFAULT_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function lastPeriods(n: number): { iso: string; label: string }[] {
  const now = new Date();
  const arr: { iso: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const label = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    arr.push({ iso, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return arr;
}

export default function PortalSolicitudes() {
  const { profile, company } = usePortalAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openType, setOpenType] = useState<SolicitudType | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const companyId = company?.id ?? DEFAULT_COMPANY_ID;
      const { data, error } = await (supabase as any).rpc('get_document_requests', { p_company_id: companyId });
      if (error) throw error;
      setRows((data ?? []) as RequestRow[]);
    } catch (e: any) {
      console.error('[solicitudes] load error', e);
      setLoadError(e?.message ?? 'No pudimos cargar las solicitudes.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [company?.id]);

  const kpis = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const inMonth = rows.filter(r => new Date(r.submitted_at) >= monthStart);
    const pendientes = rows.filter(r => ['pendiente', 'en_proceso'].includes(r.status)).length;
    const completadas = rows.filter(r => ['completada', 'aprobada'].includes(r.status)).length;
    return { total: inMonth.length, pendientes, completadas, avg: 0 };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter(r => matchesSearch([
      r.requestor_name, r.doc_type, r.doc_label, TYPE_LABELS[r.doc_type ?? ''], r.reason, r.scope_label, r.scope,
    ], search));
  }, [rows, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PortalPageHeader
        eyebrow="Bandeja"
        title="Solicitudes"
        subtitle="Pide y haz seguimiento a documentos laborales para tus trabajadores."
        notifications={kpis.pendientes}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Solicitudes este mes" value={kpis.total} accent="#0F2440" />
        <KpiCard label="Pendientes" value={kpis.pendientes} accent="#F97316" pulse={kpis.pendientes > 0} />
        <KpiCard label="Completadas" value={kpis.completadas} accent="#15803D" />
        <KpiCard label="Tiempo promedio" value={kpis.avg > 0 ? `${kpis.avg.toFixed(1)} h` : '—'} accent="#1D4ED8" />
      </div>

      {/* Nueva solicitud */}
      <section className="p-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Nueva solicitud</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Elige el tipo de documento que necesitas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setOpenType(t.key)}
              className="group text-left p-4 rounded-2xl border border-border bg-card hover:border-[#F97316] hover:shadow-md transition-all duration-200 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.emoji}</span>
                <h3 className="font-semibold text-sm">{t.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
              <span className="mt-2 inline-flex items-center justify-center self-start text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ background: '#F97316' }}>
                Solicitar
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Dashboard tabla */}
      <section className="p-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold tracking-tight">Solicitudes recibidas</h2>
        </div>
        <PortalSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por solicitante, trabajador, tipo…"
          total={rows.length}
          results={filtered.length}
        />
        {loadError ? (
          <div className="mt-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm">
            <p className="font-semibold text-destructive mb-1">No pudimos cargar las solicitudes</p>
            <p className="text-muted-foreground text-xs">{loadError}</p>
            <button onClick={load} className="mt-2 text-xs font-semibold" style={{ color: '#F97316' }}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2 mt-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? 'No hay solicitudes aún.' : 'Sin resultados para tu búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto mt-3 -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-2 py-2 font-semibold">Tipo</th>
                  <th className="px-2 py-2 font-semibold">Solicitante</th>
                  <th className="px-2 py-2 font-semibold">Detalle</th>
                  <th className="px-2 py-2 font-semibold">Fecha</th>
                  <th className="px-2 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const docKey = r.doc_type ?? '';
                  const tipoLabel = r.doc_label ?? TYPE_LABELS[docKey] ?? docKey ?? '—';
                  const detalle = r.scope_label
                    ?? (r.scope === 'all' ? 'Toda la empresa' : r.reason ?? '—');
                  const st = STATUS_META[r.status] ?? STATUS_META.pendiente;
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-2 py-2.5 font-medium">{tipoLabel}</td>
                      <td className="px-2 py-2.5">{r.requestor_name ?? '—'}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{detalle}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{fmtDate(r.submitted_at)}</td>
                      <td className="px-2 py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: st.bg, color: st.color }}>
                          {r.status === 'pendiente' && <Clock3 className="w-3 h-3" />}
                          {r.status === 'en_proceso' && <Loader2 className="w-3 h-3" />}
                          {(r.status === 'completada' || r.status === 'aprobada') && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === 'rechazada' && <AlertCircle className="w-3 h-3" />}
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </section>

      {openType && (
        <SolicitudModal
          type={openType}
          onClose={() => setOpenType(null)}
          onSent={() => { setOpenType(null); load(); }}
          requestorDefault={profile?.full_name ?? ''}
          companyId={company?.id ?? null}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, pulse }: { label: string; value: string | number; accent: string; pulse?: boolean }) {
  return (
    <div className="p-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 tracking-tight ${pulse ? 'animate-pulse' : ''}`} style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

/* ────────────────────────────── MODAL ────────────────────────────── */

interface WorkerMini { id: string; first_name: string; last_name: string; rut: string | null; cost_center: string | null; }

function SolicitudModal({
  type, onClose, onSent, requestorDefault, companyId,
}: {
  type: SolicitudType;
  onClose: () => void;
  onSent: () => void;
  requestorDefault: string;
  companyId: string | null;
}) {
  const { toast } = useToast();
  const meta = TYPES.find(t => t.key === type)!;

  const [requestor, setRequestor] = useState(requestorDefault);
  const [scope, setScope] = useState<'worker' | 'branch' | 'all'>('worker');
  const [worker, setWorker] = useState<WorkerMini | null>(null);
  const [branch, setBranch] = useState<string>(BRANCH_OPTIONS[0].code);
  const [periods, setPeriods] = useState<string[]>([]);
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [contractKind, setContractKind] = useState<'vigente' | 'todos'>('vigente');
  const [purpose, setPurpose] = useState<'banco' | 'arriendo' | 'visa' | 'otro'>('banco');
  const [incidentDate, setIncidentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Worker search
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WorkerMini[]>([]);
  useEffect(() => {
    if (scope !== 'worker') return;
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('portal_workers')
        .select('id, first_name, last_name, rut, cost_center')
        .eq('active', true)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,rut.ilike.%${q}%`)
        .limit(15);
      setResults((data ?? []) as any);
    }, 200);
    return () => clearTimeout(t);
  }, [q, scope]);

  const months6 = useMemo(() => lastPeriods(6), []);
  const showScope = type !== 'accidente'; // accidente siempre individual
  const showWorkerScope = type === 'liquidacion' ? 3 : 2; // liquidacion permite "all"

  const submit = async () => {
    if (!requestor.trim()) { toast({ title: 'Indica tu nombre', variant: 'destructive' }); return; }
    if (type === 'accidente' && !worker) { toast({ title: 'Selecciona un trabajador', variant: 'destructive' }); return; }
    if ((type === 'contrato' || type === 'remuneraciones') && !worker) {
      toast({ title: 'Selecciona un trabajador', variant: 'destructive' }); return;
    }
    if (scope === 'worker' && !worker && type !== 'accidente' && type !== 'contrato' && type !== 'remuneraciones') {
      toast({ title: 'Selecciona un trabajador', variant: 'destructive' }); return;
    }
    if (type === 'liquidacion' && periods.length === 0) {
      toast({ title: 'Selecciona al menos un período', variant: 'destructive' }); return;
    }

    setSubmitting(true);
    const effectiveScope = ['accidente', 'contrato', 'remuneraciones'].includes(type) ? 'worker' : scope;
    const payload: any = {
      portal_company_id: companyId,
      request_type: 'otro',           // enum requirement
      doc_type: type,
      status: 'pendiente',
      requestor_name: requestor.trim(),
      reason: notes.trim() || null,
      scope: effectiveScope,
      scope_value: effectiveScope === 'branch' ? branch : effectiveScope === 'worker' ? (worker?.id ?? null) : null,
      worker_id: effectiveScope === 'worker' ? (worker?.id ?? null) : null,
      workers_affected: effectiveScope === 'worker' && worker
        ? [worker.id]
        : effectiveScope === 'branch'
          ? `all_branch:${branch}`
          : effectiveScope === 'all' ? 'all_company' : null,
      periods: type === 'liquidacion' ? periods : null,
      format: type === 'liquidacion' ? format : null,
      details: {
        type,
        ...(type === 'contrato' ? { contract_kind: contractKind } : {}),
        ...(type === 'remuneraciones' ? { purpose } : {}),
        ...(type === 'accidente' ? { incident_date: incidentDate || null } : {}),
        ...(type === 'liquidacion' ? { periods, format } : {}),
        scope: effectiveScope,
        branch: effectiveScope === 'branch' ? branch : null,
        worker: worker ? { id: worker.id, name: `${worker.first_name} ${worker.last_name}`, rut: worker.rut } : null,
      },
    };

    const { error } = await supabase.from('portal_approval_requests').insert(payload);
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast({ title: 'No pudimos enviar la solicitud', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Solicitud enviada', description: 'Recibirás respuesta en máximo 24 horas hábiles.' });
    onSent();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: 'fadeSlide 0.2s' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{meta.emoji}</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-base truncate">{meta.label}</h2>
              <p className="text-xs text-muted-foreground truncate">{meta.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <Field label="Tu nombre">
            <input
              value={requestor}
              onChange={e => setRequestor(e.target.value)}
              className="p-input w-full"
              placeholder="Quien hace la solicitud"
            />
          </Field>

          {/* Scope selector */}
          {showScope && type !== 'contrato' && type !== 'remuneraciones' && (
            <Field label="¿A quién corresponde?">
              <div className="flex flex-wrap gap-2">
                <ScopeBtn active={scope==='worker'} onClick={() => setScope('worker')}>Individual</ScopeBtn>
                <ScopeBtn active={scope==='branch'} onClick={() => setScope('branch')}>Por sucursal</ScopeBtn>
                {type === 'liquidacion' && (
                  <ScopeBtn active={scope==='all'} onClick={() => setScope('all')}>Todos</ScopeBtn>
                )}
              </div>
            </Field>
          )}

          {/* Worker picker */}
          {(scope === 'worker' || ['accidente', 'contrato', 'remuneraciones'].includes(type)) && (
            <Field label="Trabajador">
              {worker ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{worker.first_name} {worker.last_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {worker.rut ?? '—'} · {BRANCH_NAMES[worker.cost_center ?? ''] ?? worker.cost_center ?? 'Sin sucursal'}
                    </p>
                  </div>
                  <button className="text-xs text-[#F97316] font-semibold" onClick={() => setWorker(null)}>Cambiar</button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      placeholder="Nombre o RUT…"
                      className="p-input w-full pl-9"
                      autoFocus
                    />
                  </div>
                  {results.length > 0 && (
                    <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-sm">
                      {results.map(w => (
                        <button
                          key={w.id}
                          onClick={() => { setWorker(w); setQ(''); setResults([]); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border/60 last:border-b-0"
                        >
                          <p className="font-medium">{w.first_name} {w.last_name}</p>
                          <p className="text-[11px] text-muted-foreground">{w.rut ?? '—'} · {BRANCH_NAMES[w.cost_center ?? ''] ?? w.cost_center ?? '—'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          )}

          {/* Branch picker */}
          {scope === 'branch' && type !== 'contrato' && type !== 'remuneraciones' && type !== 'accidente' && (
            <Field label="Sucursal (norte → sur)">
              <select value={branch} onChange={e => setBranch(e.target.value)} className="p-input w-full">
                {BRANCH_OPTIONS.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Liquidación specifics */}
          {type === 'liquidacion' && (
            <>
              <Field label="Período(s)">
                <div className="grid grid-cols-2 gap-2">
                  {months6.map(m => (
                    <label key={m.iso} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:border-[#F97316]">
                      <input
                        type="checkbox"
                        checked={periods.includes(m.iso)}
                        onChange={e => setPeriods(p => e.target.checked ? [...p, m.iso] : p.filter(x => x !== m.iso))}
                      />
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Formato">
                <div className="flex gap-2">
                  <ScopeBtn active={format==='pdf'} onClick={() => setFormat('pdf')}>PDF</ScopeBtn>
                  <ScopeBtn active={format==='excel'} onClick={() => setFormat('excel')}>Excel</ScopeBtn>
                </div>
              </Field>
            </>
          )}

          {/* Contrato */}
          {type === 'contrato' && (
            <Field label="Tipo de contrato">
              <div className="flex gap-2">
                <ScopeBtn active={contractKind==='vigente'} onClick={() => setContractKind('vigente')}>Vigente</ScopeBtn>
                <ScopeBtn active={contractKind==='todos'} onClick={() => setContractKind('todos')}>Todos los contratos</ScopeBtn>
              </div>
            </Field>
          )}

          {/* Remuneraciones */}
          {type === 'remuneraciones' && (
            <Field label="Motivo">
              <div className="grid grid-cols-2 gap-2">
                {(['banco','arriendo','visa','otro'] as const).map(p => (
                  <ScopeBtn key={p} active={purpose===p} onClick={() => setPurpose(p)}>
                    {p === 'banco' ? 'Banco' : p === 'arriendo' ? 'Arriendo' : p === 'visa' ? 'Visa' : 'Otro'}
                  </ScopeBtn>
                ))}
              </div>
            </Field>
          )}

          {/* Accidente */}
          {type === 'accidente' && (
            <Field label="Fecha del incidente">
              <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="p-input w-full" />
            </Field>
          )}

          <Field label={type === 'otro' ? 'Describe qué documento necesitas' : 'Observaciones (opcional)'}>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'otro' ? 'Ej: certificado de antigüedad…' : 'Detalles adicionales'}
              className="p-textarea w-full"
            />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/30">
          <button onClick={onClose} className="p-btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: '#F97316' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ScopeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
      style={{
        background: active ? '#F97316' : 'transparent',
        color: active ? 'white' : 'inherit',
        borderColor: active ? '#F97316' : 'hsl(var(--border))',
      }}
    >
      {children}
    </button>
  );
}
