import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatName } from '@/lib/utils';
import type { Postulante } from '@/hooks/usePostulantes';

const getAvatar = (nombre: string) =>
  nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const normalizeCargo = (raw: string | null): string => {
  if (!raw) return 'Sin vacante';
  let cleaned = raw.replace(/\s+\d{4}-\d{2}-\d{2}[\s\d:]*$/, '').trim();
  cleaned = cleaned.replace(/^(Postulo\s+|Re:\s+)/i, '').trim();
  return cleaned || 'Sin vacante';
};

const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

interface ConversationItem {
  postulante: Postulante;
  lastMessage: string;
  lastMessageTime: string | null;
  isAgentLast: boolean;
}

export const WhatsAppView: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ rol: string; mensaje: string; created_at: string | null }>>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Fetch postulantes that have conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);

      // Get all postulantes that have conversations
      const { data: postulantes } = await supabase
        .from('postulantes')
        .select('*')
        .or('mensaje_postulante.neq.,respuesta_agente.neq.')
        .order('created_at', { ascending: false });

      if (!postulantes) { setLoading(false); return; }

      // Also check conversaciones table for latest message per postulante
      const { data: convos } = await supabase
        .from('conversaciones')
        .select('postulante_id, mensaje, rol, created_at')
        .order('created_at', { ascending: false });

      const convoMap = new Map<string, { mensaje: string; rol: string; created_at: string | null }>();
      if (convos) {
        for (const c of convos) {
          if (c.postulante_id && !convoMap.has(c.postulante_id)) {
            convoMap.set(c.postulante_id, c);
          }
        }
      }

      const items: ConversationItem[] = postulantes
        .filter(p => p.mensaje_postulante || p.respuesta_agente || convoMap.has(p.id))
        .map(p => {
          const convo = convoMap.get(p.id);
          let lastMessage = '';
          let lastMessageTime: string | null = null;
          let isAgentLast = false;

          if (convo) {
            lastMessage = convo.mensaje;
            lastMessageTime = convo.created_at;
            isAgentLast = convo.rol === 'agente';
          } else if (p.respuesta_agente) {
            lastMessage = p.respuesta_agente;
            lastMessageTime = p.created_at;
            isAgentLast = true;
          } else if (p.mensaje_postulante) {
            lastMessage = p.mensaje_postulante;
            lastMessageTime = p.created_at;
            isAgentLast = false;
          }

          return { postulante: p, lastMessage, lastMessageTime, isAgentLast };
        })
        .sort((a, b) => {
          const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return tb - ta;
        });

      setConversations(items);
      setLoading(false);
    };
    fetchConversations();
  }, []);

  // Fetch messages for selected postulante
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const fetchMessages = async () => {
      setLoadingMsgs(true);
      const selected = conversations.find(c => c.postulante.id === selectedId);
      const msgs: Array<{ rol: string; mensaje: string; created_at: string | null }> = [];

      // Add legacy messages from postulantes table
      if (selected?.postulante.mensaje_postulante) {
        msgs.push({ rol: 'postulante', mensaje: selected.postulante.mensaje_postulante, created_at: selected.postulante.created_at });
      }
      if (selected?.postulante.respuesta_agente) {
        msgs.push({ rol: 'agente', mensaje: selected.postulante.respuesta_agente, created_at: selected.postulante.created_at });
      }

      // Add messages from conversaciones table
      const { data } = await supabase
        .from('conversaciones')
        .select('rol, mensaje, created_at')
        .eq('postulante_id', selectedId)
        .order('created_at', { ascending: true });

      if (data) msgs.push(...data);
      setMessages(msgs);
      setLoadingMsgs(false);
    };
    fetchMessages();
  }, [selectedId, conversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.postulante.nombre.toLowerCase().includes(q) ||
      (c.postulante.vacante_origen || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const selectedPostulante = conversations.find(c => c.postulante.id === selectedId)?.postulante;

  return (
    <div className="flex h-[calc(100vh-2rem)] rounded-2xl border border-border overflow-hidden bg-card">
      {/* Left Panel — Conversation List */}
      <div className="w-[360px] border-r border-border flex flex-col bg-card shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground mb-3">💬 WhatsApp</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin conversaciones</p>
          ) : (
            filteredConversations.map(({ postulante: p, lastMessage, lastMessageTime, isAgentLast }) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left border-none cursor-pointer transition-colors ${
                  selectedId === p.id
                    ? 'bg-primary/10'
                    : 'bg-transparent hover:bg-muted/60'
                }`}
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {getAvatar(p.nombre)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{formatName(p.nombre)}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(lastMessageTime)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mb-0.5">{normalizeCargo(p.vacante_origen)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isAgentLast && <span className="text-primary font-medium">Tú: </span>}
                    {lastMessage.slice(0, 60)}{lastMessage.length > 60 ? '…' : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className="flex-1 flex flex-col bg-background">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-3">💬</p>
              <p className="text-sm text-muted-foreground">Selecciona una conversación para ver los mensajes</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                {selectedPostulante ? getAvatar(selectedPostulante.nombre) : '??'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{selectedPostulante ? formatName(selectedPostulante.nombre) : ''}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedPostulante ? normalizeCargo(selectedPostulante.vacante_origen) : ''}
                  {selectedPostulante?.telefono && ` · ${selectedPostulante.telefono}`}
                </p>
              </div>
              {selectedPostulante?.telefono && (
                <button
                  onClick={() => {
                    const raw = selectedPostulante.telefono?.replace(/\D/g, '') || '';
                    const num = raw.startsWith('56') ? raw : `56${raw}`;
                    window.open(`https://wa.me/${num}`, '_blank');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white border-none cursor-pointer transition-colors"
                >
                  📱 Abrir WhatsApp
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--muted) / 0.3) 0%, transparent 50%)' }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground italic">Sin mensajes aún</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((m, i) => {
                    const isAgent = m.rol === 'agente';
                    return (
                      <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                            isAgent
                              ? 'bg-green-600 text-white rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}
                        >
                          <p className={`text-[10px] font-semibold mb-1 ${isAgent ? 'text-green-100' : 'text-muted-foreground'}`}>
                            {isAgent ? '🤖 Nodo Talentos (IA)' : 'Postulante'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.mensaje}</p>
                          {m.created_at && (
                            <p className={`text-[10px] mt-1.5 ${isAgent ? 'text-green-100' : 'text-muted-foreground'}`}>
                              {new Date(m.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer — Input + Enviar */}
            <div className="px-4 py-3 border-t border-border bg-card">
              {(() => {
                const raw = selectedPostulante?.telefono?.replace(/\D/g, '') || '';
                const hasPhone = raw.length >= 8 && !selectedPostulante?.telefono?.includes('$');
                if (!hasPhone) {
                  return <p className="text-[11px] text-muted-foreground text-center">📱 Sin número de teléfono registrado</p>;
                }
                const phoneNumber = raw.startsWith('56') ? raw : `56${raw}`;
                return (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newMessage.trim()) {
                          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(newMessage)}`, '_blank');
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      disabled={!newMessage.trim()}
                      onClick={() => {
                        if (newMessage.trim()) {
                          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(newMessage)}`, '_blank');
                        }
                      }}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-xl border-none transition-all cursor-pointer ${
                        newMessage.trim()
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      Enviar
                    </button>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
