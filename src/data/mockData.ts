export interface Cliente {
  id: number;
  nombre: string;
  industria: string;
  contacto: string;
  email: string;
  estado: string;
}

export interface Responsable {
  id: string;
  nombre: string;
  iniciales: string;
}

export const RESPONSABLES: Responsable[] = [
  { id: 'JRB', nombre: 'Jose Luis Romero', iniciales: 'JRB' },
  { id: 'AWV', nombre: 'Alan Willson Vergara', iniciales: 'AWV' },
  { id: 'JGP', nombre: 'Jorge Gabler Perez-Cotapos', iniciales: 'JGP' },
];

export interface Vacante {
  id: number;
  cargo: string;
  clienteId: number;
  tipo: string;
  ubicacion: string;
  renta: string;
  estado: string;
  fecha: string;
  postulantes: number;
  responsableId: string;
}

export interface Talento {
  id: number;
  nombre: string;
  profesion: string;
  experiencia: string;
  renta: string;
  habilidades: string[];
  match: number;
  avatar: string;
}

export interface PipelineEntry {
  vacanteId: number;
  candidatoId: number;
  etapa: string;
}

export const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nombre: 'TechCorp Solutions', industria: 'Tecnología', contacto: 'Ana Silva', email: 'ana@techcorp.cl', estado: 'Activo' },
  { id: 2, nombre: 'Retail S.A.', industria: 'Retail', contacto: 'Carlos Pinto', email: 'carlos@retailsa.cl', estado: 'Activo' },
  { id: 3, nombre: 'Logística Sur', industria: 'Transporte', contacto: 'Mario Ruiz', email: 'mario@logsur.cl', estado: 'Inactivo' },
];

export const INITIAL_VACANTES: Vacante[] = [
  { id: 1, cargo: 'Desarrollador Fullstack Senior', clienteId: 1, tipo: 'Reclutamiento', ubicacion: 'Remoto / Santiago', renta: '$2.5M - $3.0M', estado: 'Activa', fecha: '2026-04-01', postulantes: 24, responsableId: 'JRB' },
  { id: 2, cargo: 'Operario de Bodega', clienteId: 2, tipo: 'EST', ubicacion: 'Quilicura', renta: '$600.000', estado: 'Activa', fecha: '2026-04-05', postulantes: 156, responsableId: 'AWV' },
  { id: 3, cargo: 'Jefe de Operaciones', clienteId: 3, tipo: 'Outsourcing', ubicacion: 'Concepción', renta: '$1.8M - $2.2M', estado: 'Pausada', fecha: '2026-03-20', postulantes: 12, responsableId: 'JGP' },
];

export const MOCK_TALENTOS: Talento[] = [
  { id: 101, nombre: 'Javiera Cárdenas', profesion: 'Ingeniera de Software', experiencia: '5 años', renta: '$2.8M', habilidades: ['React', 'Node.js', 'PostgreSQL', 'AWS'], match: 92, avatar: 'JC' },
  { id: 102, nombre: 'Pedro Morales', profesion: 'Operario Logístico', experiencia: '3 años', renta: '$650.000', habilidades: ['Grúa Horquilla', 'Inventario', 'RF'], match: 85, avatar: 'PM' },
  { id: 103, nombre: 'Sofía Reyes', profesion: 'Fullstack Developer', experiencia: '2 años', renta: '$2.0M', habilidades: ['Vue', 'Python', 'SQL'], match: 65, avatar: 'SR' },
  { id: 104, nombre: 'Luis Valenzuela', profesion: 'Ingeniero Comercial', experiencia: '8 años', renta: '$2.5M', habilidades: ['Liderazgo', 'KPIs', 'Operaciones'], match: 78, avatar: 'LV' },
  { id: 105, nombre: 'Camila Soto', profesion: 'Desarrolladora Frontend', experiencia: '4 años', renta: '$2.2M', habilidades: ['React', 'Tailwind', 'TypeScript'], match: 88, avatar: 'CS' },
];

export const INITIAL_PIPELINE: PipelineEntry[] = [
  { vacanteId: 1, candidatoId: 101, etapa: 'Entrevistados' },
  { vacanteId: 1, candidatoId: 103, etapa: 'En Screening' },
  { vacanteId: 1, candidatoId: 105, etapa: 'Finalista' },
  { vacanteId: 2, candidatoId: 102, etapa: 'Postulantes Nuevos' },
  { vacanteId: 3, candidatoId: 104, etapa: 'Presentados a Cliente' },
];

export const PIPELINE_STAGES = ['Postulantes Nuevos', 'En Screening', 'Entrevistados', 'Presentados a Cliente', 'Finalista', 'Contratado'] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_COLORS: Record<PipelineStage, { bg: string; border: string; text: string; dot: string }> = {
  'Postulantes Nuevos': { bg: 'hsl(var(--kanban-postulo))', border: 'hsl(var(--kanban-postulo-border))', text: 'hsl(var(--kanban-postulo-text))', dot: 'hsl(var(--kanban-postulo-dot))' },
  'En Screening': { bg: 'hsl(var(--kanban-screening))', border: 'hsl(var(--kanban-screening-border))', text: 'hsl(var(--kanban-screening-text))', dot: 'hsl(var(--kanban-screening-dot))' },
  'Entrevistados': { bg: 'hsl(var(--kanban-entrevista))', border: 'hsl(var(--kanban-entrevista-border))', text: 'hsl(var(--kanban-entrevista-text))', dot: 'hsl(var(--kanban-entrevista-dot))' },
  'Presentados a Cliente': { bg: 'hsl(var(--kanban-presentado))', border: 'hsl(var(--kanban-presentado-border))', text: 'hsl(var(--kanban-presentado-text))', dot: 'hsl(var(--kanban-presentado-dot))' },
  'Finalista': { bg: 'hsl(var(--kanban-finalista))', border: 'hsl(var(--kanban-finalista-border))', text: 'hsl(var(--kanban-finalista-text))', dot: 'hsl(var(--kanban-finalista-dot))' },
  'Contratado': { bg: 'hsl(var(--kanban-contratado))', border: 'hsl(var(--kanban-contratado-border))', text: 'hsl(var(--kanban-contratado-text))', dot: 'hsl(var(--kanban-contratado-dot))' },
};
