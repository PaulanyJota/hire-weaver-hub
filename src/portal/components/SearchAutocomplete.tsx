import { useEffect, useId, useMemo, useRef, useState, KeyboardEvent, ReactNode } from 'react';
import { Search } from 'lucide-react';

export interface AutocompleteItem {
  key: string;
  label: string;
  subtitle?: string | null;
  /** Texto adicional que también se usa para hacer match (RUT, cargo, etc.) */
  match?: Array<string | null | undefined>;
  /** Render personalizado para la fila del dropdown. */
  render?: (active: boolean) => ReactNode;
  /** Payload original (por si el consumidor lo necesita en onSelect). */
  data?: any;
}

export interface SearchAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  items: AutocompleteItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Mínimo de caracteres para activar el dropdown. */
  minChars?: number;
  /** Máximo de resultados visibles. */
  maxResults?: number;
  /** Callback cuando el usuario selecciona un ítem (click o Enter). */
  onSelect?: (item: AutocompleteItem) => void;
  /** Texto cuando no hay coincidencias. */
  emptyText?: string;
}

function normalize(s: string | null | undefined): string {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Input de búsqueda reutilizable con dropdown de autocomplete.
 * - Filtra por substring en cualquier parte (label + subtitle + match[]).
 * - Mínimo `minChars` (default 1) para abrir el dropdown.
 * - Navegación: ↑ ↓ Enter Escape.
 * - Click fuera cierra el dropdown.
 */
export default function SearchAutocomplete({
  value,
  onChange,
  items,
  placeholder = 'Buscar...',
  className = '',
  inputClassName = '',
  minChars = 1,
  maxResults = 8,
  onSelect,
  emptyText = 'Sin coincidencias',
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const q = value.trim();
  const matches = useMemo(() => {
    if (q.length < minChars) return [];
    const nq = normalize(q);
    const out: AutocompleteItem[] = [];
    for (const it of items) {
      const hay = [it.label, it.subtitle, ...(it.match ?? [])]
        .map(normalize)
        .join(' \u0001 ');
      if (hay.includes(nq)) {
        out.push(it);
        if (out.length >= maxResults) break;
      }
    }
    return out;
  }, [items, q, minChars, maxResults]);

  useEffect(() => {
    setHighlighted(0);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const showDropdown = open && q.length >= minChars;

  const handleSelect = (it: AutocompleteItem) => {
    setOpen(false);
    onSelect?.(it);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (showDropdown && matches[highlighted]) {
        e.preventDefault();
        handleSelect(matches[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showDropdown && matches[highlighted] ? `${listId}-${highlighted}` : undefined}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`p-input pl-9 ${inputClassName}`}
      />

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            matches.map((it, idx) => {
              const active = idx === highlighted;
              return (
                <div
                  key={it.key}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={active}
                  onMouseDown={e => { e.preventDefault(); handleSelect(it); }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`cursor-pointer px-3 py-2 text-sm border-b border-slate-100 last:border-b-0 ${
                    active ? 'bg-slate-100' : 'bg-white'
                  }`}
                >
                  {it.render ? it.render(active) : (
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'hsl(var(--p-text, 215 32% 14%))' }}>
                        {it.label}
                      </p>
                      {it.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate">{it.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
