import api from './api';

export interface ConversationParticipant {
  id: string;
  userId: string | null;
  audience: string;
  role: string;
  isActive: boolean;
  user: { id: string; name: string; email: string; role: string } | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  body: string;
  images: string[];
  visibility: string;
  senderUserId: string | null;
  senderUser: { id: string; name: string; email: string; role: string } | null;
  senderType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  kind: string;
  title: string | null;
  topic: string | null;
  visibility: string;
  projectId: string | null;
  project?: { id: string; name: string; clientName?: string | null } | null;
  agendaEventId: string | null;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export const conversationService = {
  list: async (params?: { projectId?: string }): Promise<Conversation[]> => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getMessages: async (conversationId: string): Promise<ConversationMessage[]> => {
    const response = await api.get(`/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (conversationId: string, body: string): Promise<ConversationMessage> => {
    const response = await api.post(`/conversations/${conversationId}/messages`, { body });
    return response.data;
  },

  create: async (data: {
    projectId: string;
    kind: 'PROJECT' | 'CLIENT_PORTAL';
    title: string;
    visibility: string;
  }): Promise<Conversation> => {
    const response = await api.post('/conversations', data);
    return response.data;
  },

  ensureProjectChannel: async (
    projectId: string,
    kind: 'PROJECT' | 'CLIENT_PORTAL',
    existing: Conversation[]
  ): Promise<Conversation> => {
    const found = existing.find(c => c.projectId === projectId && c.kind === kind);
    if (found) return found;
    return conversationService.create({
      projectId,
      kind,
      title: kind === 'CLIENT_PORTAL' ? 'Cliente' : 'Interno',
      visibility: kind === 'CLIENT_PORTAL' ? 'CLIENT_PORTAL' : 'INTERNAL',
    });
  },
};

export const unreadService = {
  markRead: (conversationId: string): void => {
    localStorage.setItem(`chat_read_${conversationId}`, new Date().toISOString());
  },

  isUnread: (conversation: Conversation): boolean => {
    const lastMsg = conversation.messages?.[0];
    if (!lastMsg) return false;
    const lastRead = localStorage.getItem(`chat_read_${conversation.id}`);
    if (!lastRead) return true;
    return new Date(lastMsg.createdAt) > new Date(lastRead);
  },
};
