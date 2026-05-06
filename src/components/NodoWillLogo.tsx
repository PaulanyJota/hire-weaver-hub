interface Props {
  size?: number;
  className?: string;
  /** When true, the central node is white with navy stroke (for dark backgrounds). */
  onDark?: boolean;
}

export function NodoWillLogo({ size = 40, className, onDark = true }: Props) {
  const navy = '#1B3A5C';
  const orange = '#F97316';
  const sky = '#3DA5E0';
  const centerFill = onDark ? '#FFFFFF' : '#FFFFFF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nodo Will"
    >
      {/* Connector lines */}
      <line x1="25" y1="25" x2="38" y2="14" stroke={navy} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="25" x2="9" y2="37" stroke={navy} strokeWidth="2.5" strokeLinecap="round" />
      {/* Satellite nodes */}
      <circle cx="38" cy="14" r="5.5" fill={sky} />
      <circle cx="9" cy="37" r="6" fill={orange} />
      {/* Central node */}
      <circle cx="25" cy="25" r="13" fill={centerFill} stroke={navy} strokeWidth="2.5" />
    </svg>
  );
}
