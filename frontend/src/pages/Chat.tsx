import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Search, Send, ChevronRight, ChevronDown } from 'lucide-react';
import {
  conversationService,
  unreadService,
  type Conversation,
  type ConversationMessage,
} from '@/services/conversationService';
import { useAuth } from '@/context/AuthContext';

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

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = async () => {
    if (!selectedId || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await conversationService.sendMessage(selectedId, text);
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
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950">
            <div className="flex gap-3 items-end bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-blue-500/50 transition-colors">
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
                disabled={!input.trim() || sending}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 select-none">
          <MessageSquare className="w-14 h-14 mb-4 opacity-15" />
          <p className="text-base font-medium">Seleccioná una conversación</p>
          <p className="text-sm mt-1 text-zinc-700">Elegí un canal de la lista para empezar</p>
        </div>
      )}
    </div>
  );
};

export default Chat;
