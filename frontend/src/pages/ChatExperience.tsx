import React from 'react';
import { Chat } from '@/pages/Chat';

/**
 * Chat ya separa correctamente lista e hilo en mobile. Esta envoltura deja
 * que la capa responsive ajuste su alto al header y a la navegación inferior
 * sin reescribir la lógica de conversaciones, adjuntos y agenda.
 */
export const ChatExperience: React.FC = () => (
  <div className="chat-experience-v2">
    <Chat />
  </div>
);
