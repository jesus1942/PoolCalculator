import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Search, Send, ChevronRight, ChevronDown, Paperclip, X, CalendarClock, Image as ImageIcon, MessageCircle, MapPin, Users as UsersIcon } from 'lucide-react';
import {
  conversationService,
  unreadService,
  type Conversation,
  type ConversationMessage,
} from '@/services/conversationService';
import { agendaService } from '@/services/agendaService';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/services/api';

const CHANNELS = {
  PROJECT: { label: 'Interno', icon: '🔧' },
  CLIENT_PORTAL: { label: 'Cliente', icon: '👤' },
} as const;

type ChannelKind = keyof typeof CHANNELS;

interface ProjectGroup {
  projectId: string;
  projectName: string;
  conversations: Conversation[];
}

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  'bg-cyan-600', 'bg-blue-600', 'bg-purple-600',
  'bg-green-600', 'bg-amber-600', 'bg-rose-600',
];

const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const resolveImageUrl = (src: string) => {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${API_BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
};

interface AgendaEventLite {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  status?: string;
  type?: string;
  project?: { id: string; name: string; clientName?: string | null; location?: string | null } | null;
  assignees?: Array<{ user?: { id: string; name: string } | null }>;
  crew?: { members?: Array<{ user?: { id: string; name: string } | null }> } | null;
  checklist?: Array<{ id: string; label: string; done?: boolean }>;
}

const formatEventDateLong = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const formatEventTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const buildVisitMessage = (event: AgendaEventLite): string => {
  const lines: string[] = [];
  lines.push(`📅 *VISITA PROGRAMADA*`);
  lines.push('━━━━━━━━━━━━━━━━━━━');
  lines.push(`📌 ${event.title}`);
  if (event.project?.name) lines.push(`🏗 Proyecto: ${event.project.name}`);
  lines.push(`🗓 ${formatEventDateLong(event.startAt)}`);
  const startT = formatEventTime(event.startAt);
  const endT = event.endAt ? formatEventTime(event.endAt) : null;
  lines.push(`🕐 ${startT}${endT ? ` – ${endT}` : ''}`);
  const place = event.location || event.project?.location;
  if (place) lines.push(`📍 ${place}`);

  const teamNames = new Set<string>();
  event.assignees?.forEach(a => a.user?.name && teamNames.add(a.user.name));
  event.crew?.members?.forEach(m => m.user?.name && teamNames.add(m.user.name));
  if (teamNames.size > 0) {
    lines.push('');
    lines.push(`👷 Equipo: ${Array.from(teamNames).join(', ')}`);
  }

  if (event.checklist && event.checklist.length > 0) {
    lines.push('');
    lines.push('📋 Tareas:');
    event.checklist.forEach(item => lines.push(`• ${item.label}`));
  }

  lines.push('');
  lines.push('📸 Recordar subir foto al llegar y al terminar.');
  return lines.join('\n');
};

const buildWhatsAppInvite = (projectName: string | undefined, channelLabel: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/chat`;
  const project = projectName ? ` del proyecto *${projectName}*` : '';
  return encodeURIComponent(
    `Hola 👋 te sumo al canal *${channelLabel}*${project}.\n\nIngresá acá para ver los mensajes y subir fotos: ${url}`
  );
};

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [showVisitPicker, setShowVisitPicker] = useState(false);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEventLite[] | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedId) ?? null;

  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string, ProjectGroup>();
    for (const conv of conversations) {
      if (!conv.projectId) continue;
      if (!map.has(conv.projectId)) {
        map.set(conv.projectId, {
          projectId: conv.projectId,
          projectName: conv.project?.name || 'Proyecto',
          conversations: [],
        });
      }
      map.get(conv.projectId)!.conversations.push(conv);
    }
    const arr = Array.from(map.values());
    if (!searchTerm) return arr;
    return arr.filter(g => g.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [conversations, searchTerm]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await conversationService.list();
      const projectConvs = data.filter(c => c.projectId);
      setConversations(projectConvs);
      if (expandedProjects.size === 0 && projectConvs.length > 0) {
        const firstPid = projectConvs[0].projectId!;
        setExpandedProjects(new Set([firstPid]));
      }
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMsgs(true);
    conversationService.getMessages(selectedId)
      .then(msgs => {
        setMessages(msgs);
        unreadService.markRead(selectedId);
      })
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await conversationService.getMessages(selectedId);
        setMessages(msgs);
        unreadService.markRead(selectedId);
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // Revoke object URLs when pendingPreviews change
  useEffect(() => {
    return () => {
      pendingPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [pendingPreviews]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedId(conv.id);
    unreadService.markRead(conv.id);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleCreateChannel = async (projectId: string, kind: 'PROJECT' | 'CLIENT_PORTAL') => {
    const key = `${projectId}-${kind}`;
    setCreating(key);
    try {
      const conv = await conversationService.ensureProjectChannel(projectId, kind, conversations);
      setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [...prev, conv]);
      setSelectedId(conv.id);
    } catch (err) {
      console.error('Error al crear canal:', err);
    } finally {
      setCreating(null);
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    const previews = files.map(f => URL.createObjectURL(f));
    setPendingFiles(prev => [...prev, ...files]);
    setPendingPreviews(prev => [...prev, ...previews]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!selectedId || (!input.trim() && pendingFiles.length === 0) || sending) return;
    const text = input.trim();
    const files = [...pendingFiles];
    setInput('');
    setPendingFiles([]);
    setPendingPreviews([]);
    setSending(true);
    try {
      const msg = await conversationService.sendMessage(selectedId, text, files.length > 0 ? files : undefined);
      setMessages(prev => [...prev, msg]);
      unreadService.markRead(selectedId);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const openVisitPicker = async () => {
    if (!selectedConversation) return;
    setShowVisitPicker(true);
    if (agendaEvents !== null && agendaEvents.length >= 0) {
      // Re-fetch in background to keep fresh, but show cached immediately
    }
    setLoadingAgenda(true);
    try {
      const params: Record<string, any> = {};
      if (selectedConversation.projectId) {
        params.projectId = selectedConversation.projectId;
      } else {
        // No project bound — fetch upcoming month
        const now = new Date();
        const in30 = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60);
        params.start = now.toISOString();
        params.end = in30.toISOString();
      }
      const data = await agendaService.list(params);
      const arr: AgendaEventLite[] = Array.isArray(data) ? data : [];
      // Sort: upcoming first (closest to today), past last
      const now = Date.now();
      arr.sort((a, b) => {
        const da = new Date(a.startAt).getTime();
        const db = new Date(b.startAt).getTime();
        const aFuture = da >= now;
        const bFuture = db >= now;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        return aFuture ? da - db : db - da;
      });
      setAgendaEvents(arr);
    } catch (err) {
      console.error('Error al cargar agenda:', err);
      setAgendaEvents([]);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const handlePickEvent = (event: AgendaEventLite) => {
    setInput(buildVisitMessage(event));
    setShowVisitPicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleWhatsAppShare = () => {
    if (!selectedConversation) return;
    const channel = CHANNELS[selectedConversation.kind as ChannelKind];
    const text = buildWhatsAppInvite(
      selectedConversation.project?.name,
      channel?.label ?? selectedConversation.title ?? 'Conversación'
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div className="flex h-[calc(100dvh-60px)] lg:h-screen overflow-hidden bg-zinc-950">

      {/* ── LEFT: Lista de proyectos y canales ── */}
      <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="px-4 py-4 border-b border-zinc-800">
          <h1 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            Mensajes
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar proyecto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loadingConvs ? (
            <div className="space-y-2 px-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-9 bg-zinc-900 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projectGroups.length === 0 ? (
            <div className="text-center text-zinc-600 text-xs py-12 px-4">
              {isAdmin
                ? 'Abrí un proyecto para iniciar una conversación'
                : 'No tenés conversaciones activas'}
            </div>
          ) : (
            projectGroups.map(group => {
              const isExpanded = expandedProjects.has(group.projectId);
              const hasUnread = group.conversations.some(c => unreadService.isUnread(c));

              return (
                <div key={group.projectId} className="mb-0.5">
                  <button
                    onClick={() => toggleProject(group.projectId)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    }
                    <span className="text-xs font-semibold truncate text-left flex-1">{group.projectName}</span>
                    {hasUnread && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 mb-1">
                      {group.conversations.map(conv => {
                        const isSelected = conv.id === selectedId;
                        const isUnread = unreadService.isUnread(conv);
                        const ch = CHANNELS[conv.kind as ChannelKind];
                        return (
                          <button
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left ${
                              isSelected
                                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                            }`}
                          >
                            <span className="text-sm shrink-0">{ch?.icon ?? '💬'}</span>
                            <span className="text-xs font-medium truncate flex-1">{ch?.label ?? conv.title ?? 'Canal'}</span>
                            {isUnread && !isSelected && (
                              <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}

                      {isAdmin && (['PROJECT', 'CLIENT_PORTAL'] as const).map(kind => {
                        if (group.conversations.some(c => c.kind === kind)) return null;
                        const ch = CHANNELS[kind];
                        const key = `${group.projectId}-${kind}`;
                        return (
                          <button
                            key={kind}
                            onClick={() => handleCreateChannel(group.projectId, kind)}
                            disabled={creating === key}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors text-left"
                          >
                            <span className="text-sm opacity-40 shrink-0">{ch.icon}</span>
                            <span className="italic">{creating === key ? 'Creando…' : `+ ${ch.label}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Hilo de mensajes ── */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950">
            <span className="text-xl">
              {CHANNELS[selectedConversation.kind as ChannelKind]?.icon ?? '💬'}
            </span>
            <div>
              <h2 className="font-semibold text-white text-sm">
                {CHANNELS[selectedConversation.kind as ChannelKind]?.label ?? selectedConversation.title}
              </h2>
              <p className="text-xs text-zinc-500">
                {selectedConversation.project?.name}
                {selectedConversation.participants?.length
                  ? ` · ${selectedConversation.participants.length} participantes`
                  : ''}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-2.5 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-52 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-zinc-600 py-16">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay mensajes aún. ¡Empezá la conversación!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderUserId === user?.id;
                const senderName = msg.senderUser?.name ?? 'Sistema';
                const showHeader = i === 0 || messages[i - 1].senderUserId !== msg.senderUserId;
                const hasImages = Array.isArray(msg.images) && msg.images.length > 0;

                return (
                  <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {showHeader ? (
                      <div
                        className={`w-8 h-8 rounded-full ${avatarColor(senderName)} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}
                      >
                        {getInitials(senderName)}
                      </div>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    <div className={`max-w-[72%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showHeader && (
                        <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold text-zinc-300">
                            {isOwn ? 'Vos' : senderName}
                          </span>
                          <span className="text-xs text-zinc-600">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      {/* Image grid */}
                      {hasImages && (
                        <div className={`mb-1 grid gap-1 ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {msg.images.map((src, idx) => {
                            const url = resolveImageUrl(src);
                            return (
                              <button
                                key={idx}
                                onClick={() => setLightboxSrc(url)}
                                className="group relative overflow-hidden rounded-xl border border-zinc-700 hover:border-blue-500/50 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Foto ${idx + 1}`}
                                  className="object-cover w-full max-h-48 rounded-xl"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* Text bubble */}
                      {msg.body && (
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                          }`}
                        >
                          {msg.body}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950">
            {/* Pending image previews */}
            {pendingPreviews.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {pendingPreviews.map((src, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar + textarea */}
            <div className="flex gap-3 items-end bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3 focus-within:border-blue-500/50 transition-colors">
              {/* Toolbar buttons */}
              <div className="flex flex-col gap-1.5 pb-0.5">
                {/* Attach photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar foto"
                  className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {/* Pick event from agenda */}
                <button
                  type="button"
                  onClick={openVisitPicker}
                  title="Compartir visita desde la agenda"
                  className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
                {/* WhatsApp invite */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  title="Invitar por WhatsApp"
                  className="p-1.5 text-zinc-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribir mensaje… (Ctrl+Enter para enviar)"
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && pendingFiles.length === 0) || sending}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 pl-1">
              📎 Fotos · 📅 Compartir evento de agenda · 💬 Invitar por WhatsApp · Ctrl+Enter para enviar
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 select-none">
          <MessageSquare className="w-14 h-14 mb-4 opacity-15" />
          <p className="text-base font-medium">Seleccioná una conversación</p>
          <p className="text-sm mt-1 text-zinc-700">Elegí un canal de la lista para empezar</p>
        </div>
      )}

      {/* Agenda event picker */}
      {showVisitPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowVisitPicker(false)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Compartir visita</h3>
                  <p className="text-xs text-zinc-500">
                    {selectedConversation?.project?.name
                      ? `Eventos de "${selectedConversation.project.name}"`
                      : 'Próximos eventos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVisitPicker(false)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loadingAgenda && agendaEvents === null ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : !agendaEvents || agendaEvents.length === 0 ? (
                <div className="text-center text-zinc-500 py-12 text-sm">
                  <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No hay eventos en la agenda para este proyecto.</p>
                  <p className="text-xs text-zinc-600 mt-1">Creá uno desde la sección Agenda.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {agendaEvents.map(event => {
                    const isFuture = new Date(event.startAt).getTime() >= Date.now();
                    const teamCount = new Set([
                      ...(event.assignees?.map(a => a.user?.id).filter(Boolean) || []),
                      ...(event.crew?.members?.map(m => m.user?.id).filter(Boolean) || []),
                    ]).size;
                    const place = event.location || event.project?.location;
                    return (
                      <button
                        key={event.id}
                        onClick={() => handlePickEvent(event)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-white truncate">{event.title}</span>
                              {!isFuture && (
                                <span className="px-1.5 py-0.5 text-[9px] bg-zinc-800 text-zinc-500 rounded uppercase">Pasado</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                {formatEventDateLong(event.startAt)} · {formatEventTime(event.startAt)}
                              </span>
                              {place && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{place}</span>
                                </span>
                              )}
                              {teamCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <UsersIcon className="w-3 h-3" />
                                  {teamCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                            Usar →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxSrc}
            alt="Vista completa"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;
