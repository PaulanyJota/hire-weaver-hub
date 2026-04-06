import React from 'react';

interface AtsButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  small?: boolean;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'hsl(217 91% 60%)', color: '#fff', boxShadow: '0 1px 3px rgba(37,99,235,0.3)', border: 'none' },
  secondary: { background: '#fff', color: '#374151', border: '1px solid #D1D5DB', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  ghost: { background: 'transparent', color: '#6B7280', border: 'none' },
  danger: { background: '#FEE2E2', color: '#B91C1C', border: 'none' },
};

const hoverBg: Record<string, string> = {
  primary: 'hsl(217 91% 52%)',
  secondary: '#F9FAFB',
  ghost: '#F3F4F6',
  danger: '#FECACA',
};

export const AtsButton: React.FC<AtsButtonProps> = ({
  children, variant = 'primary', icon, onClick, type = 'button', small, title, style = {}, className = ''
}) => {
  const vs = variantStyles[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold cursor-pointer transition-all outline-none ${className}`}
      style={{
        fontSize: small ? 12 : 13,
        padding: small ? '6px 12px' : '8px 18px',
        ...vs,
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = hoverBg[variant]; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = vs.background || 'transparent'; }}
    >
      {icon}{children}
    </button>
  );
};
