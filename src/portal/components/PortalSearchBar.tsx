import { Search, X } from 'lucide-react';

/** Normaliza texto: minúsculas + sin tildes. */
export function normalizeText(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Devuelve true si TODOS los tokens de la query aparecen en al menos uno
 * de los `fields` proporcionados. Búsqueda insensible a tildes y mayúsculas.
 */
export function matchesSearch(
  fields: Array<string | null | undefined>,
  query: string,
): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const hay = fields.map(normalizeText).join(' \u0001 ');
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every(t => hay.includes(t));
}

interface PortalSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** total de items en el dataset original (opcional, para badge "X de Y") */
  total?: number;
  /** cantidad de resultados después de filtrar (opcional, muestra badge cuando search activo) */
  results?: number;
  className?: string;
  autoFocus?: boolean;
}

export default function PortalSearchBar({
  value,
  onChange,
  placeholder = 'Buscar por nombre, RUT, sucursal o cargo…',
  total,
  results,
  className = '',
  autoFocus,
}: PortalSearchBarProps) {
  const active = value.trim().length > 0;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
          aria-label="Buscar"
        />
        {active && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {active && (results != null || total != null) && (
        <span
          className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums border whitespace-nowrap"
          style={{ background: '#F9731615', color: '#c2410c', borderColor: '#F9731640' }}
        >
          {results ?? 0}
          {total != null ? ` de ${total}` : ''} resultado{(results ?? 0) === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}
