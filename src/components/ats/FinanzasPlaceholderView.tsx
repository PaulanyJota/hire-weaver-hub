import React from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
}

export const FinanzasPlaceholderView: React.FC<Props> = ({ titulo, subtitulo }) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">📊</p>
        <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted-foreground mt-1">{subtitulo}</p>}
        <p className="text-xs text-muted-foreground mt-4 italic">Módulo en preparación.</p>
      </div>
    </div>
  );
};
