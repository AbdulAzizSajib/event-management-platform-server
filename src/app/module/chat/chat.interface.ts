export interface IStartConversation {
  eventId: string;
}

export interface ISendMessage {
  conversationId: string;
  content: string;
}
