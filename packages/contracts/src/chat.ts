export interface ChatConversation {
  tripId: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;
  status: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'INTERRUMPIDO';
  canSend: boolean;
  hasUnread: boolean;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  authorName: string;
  isMine: boolean;
  body: string;
  createdAt: string;
}

export interface ChatConversationPage {
  items: ChatConversation[];
  nextCursor: string | null;
}

export interface ChatHistoryPage {
  conversation: ChatConversation;
  messages: ChatMessage[];
  nextCursor: string | null;
}
