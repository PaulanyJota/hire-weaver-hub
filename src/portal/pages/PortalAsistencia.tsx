import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertTriangle, CheckCircle2, UserX, ArrowUpDown, X } from 'lucide-react';
import { PortalAvatar } from '../components/Avatar';
import { usePortalAuth } from '../hooks/usePortalAuth';
import PortalPageHeader from '../components/PortalPageHeader';
import AttendanceTeamStatus, { type PresenteRow } from '../components/AttendanceTeamStatus';
import WorkerNameLink from '../components/WorkerNameLink';
import { useSucursalesCount } from '../hooks/useSucursalesCount';
import { sucursalGeoIndexByName, sucursalName } from '../lib/sucursales';
import { useBranchRankingKpis, usePerfectAttendance } from '../hooks/useBranchRankingKpis';

type Row = {
  worker_id: string;
  portal_company_id: string;
  nombre: string;
  iniciales: string;
  worker_position: string | null;
  cost_center: string | null;
  sucursal: string | null;
  photo_url: string | null;
  ultimo_check_in: string | null;
  dias_registrados: number;
  dias_marcados: number;
  dias_puntual: number;
  dias_atraso: number;
  max_atraso_min: number;
  promedio_atraso_min: number;
  pct_puntualidad: number | null;
};

type SortKey = 'nombre' | 'sucursal' | 'ultimo_check_in' | 'dias_marcados' | 'dias_atraso' | 'pct_puntualidad';

export default function PortalAsistencia() {
  const { company } = usePortalAuth();
  const { data: perfect = [] } = usePerfectAttendance(company?.id);
  const { data: branchKpis } = useBranchRankingKpis(company?.id);
  const sucursalesCount = useSucursalesCount();
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalFilter, setSucursalFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('pct_puntualidad');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Smart attendance (Parte C)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  type SmartData = {
    esperados_hoy: number;
    marcaron_hoy: number;
    pct_asistencia_real: number;
    presentes: PresenteRow[];
    ausentes: Array<{ worker_id: string; nombre: string; branch_name: string | null; cost_center?: string | null }>;
  };
  const [smart, setSmart] = useState<SmartData | null>(null);
  const [smartLoading, setSmartLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'presentes' | 'ausentes'>('presentes');

  // Refresh all inferred schedules once on mount (best-effort)
  useEffect(() => {
    (async () => {
      try {
        await supabase.rpc('refresh_all_inferred_schedules' as any, { p_company_id: company?.id ?? null, p_lookback_days: 60 });
      } catch (e) {
        console.error('refresh_all_inferred_schedules', e);
      }
      loadSmart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  const LUCANO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
  const loadSmart = async () => {
    setSmartLoading(true);
    const { data, error } = await supabase.rpc('get_attendance_today_smart' as any, {
      p_company_id: company?.id ?? LUCANO_COMPANY_ID,
      p_date: selectedDate,
    });
    if (error) console.error('get_attendance_today_smart', error);
    setSmart((data as SmartData) ?? null);
    setSmartLoading(false);
  };

  useEffect(() => { loadSmart(); /* eslint-disable-next-line */ }, [selectedDate, company?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_attendance_ranking', { p_days: days });
      if (!cancelled) {
        if (error) console.error('get_attendance_ranking', error);
        setRows(((data ?? []) as Row[]));
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days]);

  const sucursales = useMemo(
    () => (Array.from(new Set(rows.map(r => r.sucursal).filter(Boolean))) as string[])
      .sort((a, b) => sucursalGeoIndexByName(a) - sucursalGeoIndexByName(b)),
    [rows]
  );

  // Empresa label (best-effort from a single company in result set)
  const empresaLabel = useMemo(() => {
    if (company?.name) return company.name;
    const set = new Set(rows.map(r => r.portal_company_id));
    return `${set.size} ${set.size === 1 ? 'empresa' : 'empresas'}`;
  }, [rows, company]);

  // Metric cards
  const metrics = useMemo(() => {
    const total = rows.length;
    const marcasHoy = rows.filter(r => r.ultimo_check_in && r.dias_marcados > 0).length;
    // Estimate "marcados hoy" as those with ultimo_check_in present in last day window — proxy
    const conMarca = rows.filter(r => r.dias_marcados > 0);
    const puntualidadAvg = conMarca.length
      ? Math.round(conMarca.reduce((s, r) => s + (r.pct_puntualidad ?? 0), 0) / conMarca.length)
      : null;
    const atrasos = rows.reduce((s, r) => s + (r.dias_atraso ?? 0), 0);
    const sinMarcaje = rows.filter(r => (r.dias_marcados ?? 0) === 0).length;
    return { total, marcasHoy, puntualidadAvg, atrasos, sinMarcaje };
  }, [rows]);

  // Top puntuales
  const topPuntuales = useMemo(() => {
    const perfectos = rows
      .filter(r => r.pct_puntualidad === 100 && r.dias_marcados > 0)
      .sort((a, b) => b.dias_marcados - a.dias_marcados);
    return { lista: perfectos.slice(0, 5), restantes: Math.max(0, perfectos.length - 5) };
  }, [rows]);

  // Requieren atención
  const atencion = useMemo(() => {
    const conProblemas = rows
      .filter(r => r.dias_marcados > 0 && r.pct_puntualidad !== null && r.pct_puntualidad < 100)
      .sort((a, b) => (a.pct_puntualidad ?? 0) - (b.pct_puntualidad ?? 0));
    const sinMarca = rows.filter(r => (r.dias_marcados ?? 0) === 0);
    return [...conProblemas, ...sinMarca].slice(0, 8);
  }, [rows]);

  // Tabla detallada
  const tabla = useMemo(() => {
    let list = rows.slice();
    if (sucursalFilter) list = list.filter(r => r.sucursal === sucursalFilter);
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [rows, sucursalFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'nombre' || k === 'sucursal' ? 'asc' : 'desc'); }
  };

  const scoreClass = (pct: number | null) => {
    if (pct == null) return 'text-slate-400 bg-slate-100';
    if (pct >= 90) return 'text-emerald-700 bg-emerald-50';
    if (pct >= 50) return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PortalPageHeader
        eyebrow="Control"
        title="Asistencia"
        subtitle={`Últimos ${days} días · ${empresaLabel} · ${sucursalesCount ?? sucursales.length} ${(sucursalesCount ?? sucursales.length) === 1 ? 'sucursal' : 'sucursales'}`}
        right={
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-white text-xs font-medium focus:outline-none [color-scheme:dark]"
              value={selectedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-white text-xs font-medium focus:outline-none [&>option]:text-foreground"
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => smart && smart.esperados_hoy > 0 && setModalOpen(true)}
          className="text-left p-card p-5 hover:shadow-md transition-shadow disabled:cursor-default"
          disabled={!smart || smart.esperados_hoy === 0}
          title={smart && smart.esperados_hoy === 0 ? 'Ningún trabajador tiene turno programado para hoy' : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--p-muted))' }}>Asistencia hoy</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-700"><Clock className="w-4 h-4" /></span>
          </div>
          {smartLoading || !smart ? (
            <div className="mt-3"><Skeleton className="h-7 w-24" /></div>
          ) : smart.esperados_hoy === 0 ? (
            <>
              <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-400">0 esperados hoy</div>
              <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--p-muted))' }}>Sin turnos programados</p>
            </>
          ) : (
            <>
              <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>
                {smart.marcaron_hoy}/{smart.esperados_hoy}
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--p-muted))' }}>
                {Number(smart.pct_asistencia_real ?? 0)}% · Basado en horario de cada trabajador
              </p>
            </>
          )}
        </button>
        <MetricCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Puntualidad"
          value={loading ? null : metrics.puntualidadAvg != null ? `${metrics.puntualidadAvg}%` : '—'}
          tone="success"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Atrasos > 5 min"
          value={loading ? null : String(metrics.atrasos)}
          tone="warning"
        />
        <MetricCard
          icon={<UserX className="w-4 h-4" />}
          label="Sin marcaje"
          value={loading ? null : String(metrics.sinMarcaje)}
          tone="danger"
        />
      </div>

      {/* Estado de marcaje del equipo */}
      <AttendanceTeamStatus presentesOverride={smart?.presentes} />

      {/* Modal Presentes / Ausentes */}
      {modalOpen && smart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,36,64,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>
                  Asistencia · {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'hsl(var(--p-muted))' }}>
                  {smart.marcaron_hoy} de {smart.esperados_hoy} esperados · {Number(smart.pct_asistencia_real ?? 0)}%
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 px-5 pt-3 border-b border-slate-200">
              {(['presentes','ausentes'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setModalTab(t)}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                    modalTab === t ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t === 'presentes' ? `Presentes (${smart.presentes.length})` : `Ausentes esperados (${smart.ausentes.length})`}
                </button>
              ))}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {modalTab === 'presentes' ? (
                smart.presentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nadie ha marcado este día.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {smart.presentes.map(p => (
                      <li key={p.worker_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <Link to={`/portal/trabajadores/${p.worker_id}`} className="text-sm font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                            {p.nombre}
                          </Link>
                          <p className="text-[11px] text-muted-foreground truncate">{p.branch_name ?? '—'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.hora_entrada ?? '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                smart.ausentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin ausentes esperados.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {smart.ausentes.map(a => (
                      <li key={a.worker_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <Link to={`/portal/trabajadores/${a.worker_id}`} className="text-sm font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                            {a.nombre}
                          </Link>
                          <p className="text-[11px] text-muted-foreground truncate">{a.branch_name ?? '—'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          Ausente
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two column lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Más puntuales */}
        <div className="p-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>Más puntuales</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% puntualidad
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : topPuntuales.lista.length === 0 ? (
            <EmptyMini text="Aún no hay trabajadores con puntualidad perfecta en el período." />
          ) : (
            <ul className="space-y-2">
              {topPuntuales.lista.map(r => (
                <li key={r.worker_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50">
                  <PortalAvatar name={r.nombre} photoUrl={r.photo_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={r.sucursal ?? r.cost_center} className="text-sm" />
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'hsl(var(--p-muted))' }}>
                      {r.ultimo_check_in ?? 'sin marca'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {r.pct_puntualidad}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          {topPuntuales.restantes > 0 && (
            <p className="mt-3 text-[11px]" style={{ color: 'hsl(var(--p-muted))' }}>
              +{topPuntuales.restantes} con 100%
            </p>
          )}
        </div>

        {/* Requieren atención */}
        <div className="p-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>Requieren atención</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              Atrasos / sin marca
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : atencion.length === 0 ? (
            <EmptyMini text="¡Excelente! Nadie requiere atención en este período." />
          ) : (
            <ul className="space-y-2">
              {atencion.map(r => {
                const sinMarca = (r.dias_marcados ?? 0) === 0;
                const borderColor = sinMarca ? '#cbd5e1' : (r.pct_puntualidad === 0 ? '#dc2626' : '#f97316');
                const desc = sinMarca
                  ? `Sin marcas en ${days} días`
                  : `${r.dias_atraso} ${r.dias_atraso === 1 ? 'atraso' : 'atrasos'} · máx ${r.max_atraso_min}min`;
                return (
                  <li
                    key={r.worker_id}
                    className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg hover:bg-slate-50"
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    <PortalAvatar name={r.nombre} photoUrl={r.photo_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={r.sucursal ?? r.cost_center} className="text-sm" />
                      <p className="text-[11px] truncate mt-0.5" style={{ color: 'hsl(var(--p-muted))' }}>
                        {desc}
                      </p>
                    </div>
                    {!sinMarca && r.pct_puntualidad != null && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border ${scoreClass(r.pct_puntualidad)}`}>
                        {r.pct_puntualidad}%
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Asistencia perfecta del mes */}
      <div className="p-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>
            ⭐ Asistencia perfecta · {perfect.length} {perfect.length === 1 ? 'trabajador' : 'trabajadores'}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Este mes
          </span>
        </div>
        {perfect.length === 0 ? (
          <EmptyMini text="Aún no hay trabajadores con asistencia perfecta este mes" />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {perfect.map(w => (
              <li key={w.worker_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-50/40 border border-slate-100">
                <div className="min-w-0 flex-1">
                  <Link to={`/portal/trabajadores/${w.worker_id}`} className="text-sm font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                    {w.nombre}
                  </Link>
                  <p className="text-[11px] truncate" style={{ color: 'hsl(var(--p-muted))' }}>
                    {sucursalName(w.sucursal)} · {w.dias_presentes} {w.dias_presentes === 1 ? 'día' : 'días'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border"
                  style={{ background: 'linear-gradient(135deg,#FCD34D,#F59E0B)', color: '#78350F', borderColor: '#F59E0B' }}>
                  100%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ranking sucursales asistencia */}
      <div className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>🏆 Ranking asistencia últimos 30 días</h3>
        </div>
        {!branchKpis ? (
          <div className="p-5 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (branchKpis.ranking_asistencia?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Sin datos de asistencia.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left px-5 py-2 font-semibold">Sucursal</th>
                <th className="text-right px-3 py-2 font-semibold">Trabajadores</th>
                <th className="text-right px-3 py-2 font-semibold">Presencias</th>
                <th className="text-left px-5 py-2 font-semibold w-[40%]">% Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {branchKpis.ranking_asistencia.map(r => (
                <tr key={r.sucursal} className="border-b border-slate-100 hover:bg-orange-50/30">
                  <td className="px-5 py-2.5 font-semibold" style={{ color: '#1B3A5C' }}>{sucursalName(r.sucursal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.trabajadores}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.presencias}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min(100, Number(r.pct_asistencia))}%`, background: 'linear-gradient(90deg, #F97316, #EA580C)' }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-14 text-right" style={{ color: '#EA580C' }}>{r.pct_asistencia}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


      {/* Tabla detalle */}
      <div className="p-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-3">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>Detalle por trabajador</h3>
          <select
            className="p-select"
            style={{ width: 200 }}
            value={sucursalFilter}
            onChange={e => setSucursalFilter(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="p-5 pt-0 space-y-2">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : tabla.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--p-text))' }}>Sin datos para mostrar</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--p-muted))' }}>Prueba cambiando el período o el filtro de sucursal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--p-muted))' }}>
                  <Th onClick={() => toggleSort('nombre')} active={sortKey === 'nombre'} dir={sortDir}>Trabajador</Th>
                  <Th onClick={() => toggleSort('sucursal')} active={sortKey === 'sucursal'} dir={sortDir} className="hidden md:table-cell">Sucursal</Th>
                  <Th onClick={() => toggleSort('ultimo_check_in')} active={sortKey === 'ultimo_check_in'} dir={sortDir} className="hidden sm:table-cell">Última marca</Th>
                  <Th onClick={() => toggleSort('dias_marcados')} active={sortKey === 'dias_marcados'} dir={sortDir} className="text-right">Marcas</Th>
                  <Th onClick={() => toggleSort('dias_atraso')} active={sortKey === 'dias_atraso'} dir={sortDir} className="text-right hidden sm:table-cell">Atrasos</Th>
                  <Th onClick={() => toggleSort('pct_puntualidad')} active={sortKey === 'pct_puntualidad'} dir={sortDir} className="text-right">Score</Th>
                </tr>
              </thead>
              <tbody>
                {tabla.map(r => (
                  <tr key={r.worker_id} className="border-t hover:bg-slate-50/60" style={{ borderColor: 'hsl(var(--p-border))' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PortalAvatar name={r.nombre} photoUrl={r.photo_url} size={32} />
                        <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={r.sucursal ?? r.cost_center} subClassName="md:hidden" />
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell" style={{ color: 'hsl(var(--p-muted))' }}>{r.sucursal ?? '—'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell tabular-nums" style={{ color: 'hsl(var(--p-text))' }}>{r.ultimo_check_in ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'hsl(var(--p-text))' }}>
                      {r.dias_marcados}<span style={{ color: 'hsl(var(--p-muted))' }}>/{r.dias_registrados}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums hidden sm:table-cell" style={{ color: r.dias_atraso > 0 ? 'hsl(var(--p-warning))' : 'hsl(var(--p-muted))' }}>
                      {r.dias_atraso}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${scoreClass(r.pct_puntualidad)}`}>
                        {r.pct_puntualidad != null ? `${r.pct_puntualidad}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | null; tone: 'brand' | 'success' | 'warning' | 'danger' }) {
  const toneMap = {
    brand: 'bg-blue-50 text-blue-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  } as const;
  return (
    <div className="p-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--p-muted))' }}>{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>
        {value ?? <Skeleton className="h-7 w-20" />}
      </div>
    </div>
  );
}

function Th({ children, onClick, active, dir, className = '' }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: 'asc' | 'desc'; className?: string }) {
  return (
    <th className={`px-5 py-3 text-left font-semibold ${className}`}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-900">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-30'}`} />
        {active && <span className="text-[9px]">{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-xs" style={{ color: 'hsl(var(--p-muted))' }}>{text}</p>
    </div>
  );
}
