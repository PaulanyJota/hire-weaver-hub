import { Link } from 'react-router-dom';
import { sucursalName } from '../lib/sucursales';

interface Props {
  workerId: string;
  name: string;
  /** Either a cost_center code (LC_VM) or already a friendly sucursal name */
  sucursal?: string | null;
  className?: string;
  subClassName?: string;
}

/**
 * Worker name link — navigates to /portal/trabajadores/:id.
 * Renders name + sucursal underneath. Hover color verde teal.
 */
export default function WorkerNameLink({ workerId, name, sucursal, className = '', subClassName = '' }: Props) {
  const sub = sucursal ? sucursalName(sucursal) : null;
  return (
    <Link
      to={`/portal/trabajadores/${workerId}`}
      className={`group block min-w-0 cursor-pointer ${className}`}
    >
      <p
        className="font-semibold truncate transition-colors group-hover:text-[#1D9E75]"
        style={{ color: 'hsl(var(--p-text, 215 32% 14%))' }}
      >
        {name}
      </p>
      {sub && (
        <p className={`text-[11px] truncate text-slate-500 ${subClassName}`}>
          {sub}
        </p>
      )}
    </Link>
  );
}
