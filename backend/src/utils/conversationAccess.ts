import { ProjectActorContext } from './projectAccess';
import { belongsToOrganization } from './tenantRelations';

/** El administrador de una empresa no puede leer ni moderar canales de otra. */
export const canManageConversation = (conversation: any, actor: ProjectActorContext) =>
  actor.role === 'SUPERADMIN' || (belongsToOrganization(conversation.organizationId, actor.orgId) &&
    (actor.role === 'ADMIN' || conversation.createdById === actor.userId));

export const canAccessConversation = (conversation: any, actor: ProjectActorContext) => {
  if (!actor.userId) return false;
  if (canManageConversation(conversation, actor)) return true;
  return belongsToOrganization(conversation.organizationId, actor.orgId) &&
    conversation.participants?.some((participant: any) => participant.userId === actor.userId && participant.isActive);
};

/** También las vistas previas respetan la visibilidad del último mensaje. */
export const sanitizeConversation = (conversation: any, actor: ProjectActorContext) => {
  if (canManageConversation(conversation, actor)) return conversation;
  return {
    ...conversation,
    messages: (conversation.messages || []).filter((message: any) => message.visibility !== 'INTERNAL_ONLY'),
  };
};
