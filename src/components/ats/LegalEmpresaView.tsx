import React, { useEffect, useRef, useState } from 'react';
import { Icons } from './Icons';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import { ToastContainer } from './ToastContainer';

interface LegalEmpresaViewProps {
  nombre: string;
  rut: string;
  empresaKey: string;
}

interface LegalDoc {
  id: string;
  empresa_key: string;
  nombre: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const LegalEmpresaView: React.FC<LegalEmpresaViewProps> = ({ nombre, rut, empresaKey }) => {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, show: showToast } = useAppToast();

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('legal_documentos')
      .select('*')
      .eq('empresa_key', empresaKey)
      .order('created_at', { ascending: false });
    if (error) showToast('Error al cargar documentos');
    else setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); /* eslint-disable-next-line */ }, [empresaKey]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { showToast('Archivo supera 20MB'); return; }
    setPendingFile(f);
    // Sugerir nombre sin extensión
    setDocName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!pendingFile || !docName.trim()) { showToast('Ingresa un nombre'); return; }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const ext = pendingFile.name.split('.').pop() ?? 'bin';
      const path = `${empresaKey}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('legal-docs')
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('legal_documentos').insert({
        empresa_key: empresaKey,
        nombre: docName.trim().slice(0, 150),
        storage_path: path,
        file_size: pendingFile.size,
        mime_type: pendingFile.type || null,
        uploaded_by: userId ?? null,
      });
      if (insErr) throw insErr;

      showToast('Documento subido');
      setPendingFile(null);
      setDocName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir';
      showToast(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: LegalDoc) => {
    const { data, error } = await supabase.storage
      .from('legal-docs')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) { showToast('No se pudo generar enlace'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const handleDelete = async (doc: LegalDoc) => {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    const { error: sErr } = await supabase.storage.from('legal-docs').remove([doc.storage_path]);
    if (sErr) { showToast('Error al eliminar archivo'); return; }
    const { error: dErr } = await supabase.from('legal_documentos').delete().eq('id', doc.id);
    if (dErr) { showToast('Error al eliminar registro'); return; }
    showToast('Documento eliminado');
    fetchDocs();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{nombre}</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard legal y societario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">RUT Empresa</p>
          <p className="text-xl font-bold text-foreground mt-2">{rut}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Razón Social</p>
          <p className="text-base font-semibold text-foreground mt-2">{nombre}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
          <p className="text-base font-semibold text-foreground mt-2">Activa</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary">{Icons.shield}</span>
          <h2 className="text-base font-bold text-foreground">Documentación Legal</h2>
        </div>

        {/* Uploader */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 p-4 bg-muted rounded-lg">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handlePickFile}
            className="text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-card file:text-foreground hover:file:bg-border"
          />
          <input
            type="text"
            placeholder="Nombre del documento"
            value={docName}
            onChange={e => setDocName(e.target.value)}
            maxLength={150}
            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            onClick={handleUpload}
            disabled={!pendingFile || !docName.trim() || uploading}
            className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay documentos cargados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nombre</th>
                  <th className="py-2 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tamaño</th>
                  <th className="py-2 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Subido</th>
                  <th className="py-2 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium text-foreground">{d.nombre}</td>
                    <td className="py-3 px-2 text-muted-foreground">{formatBytes(d.file_size)}</td>
                    <td className="py-3 px-2 text-muted-foreground">{formatDate(d.created_at)}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleDownload(d)}
                          className="px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md border-none cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          Descargar
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted rounded-md border-none cursor-pointer hover:bg-border hover:text-destructive transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
};
