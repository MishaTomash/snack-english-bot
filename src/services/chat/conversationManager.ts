import { ChatTurn } from './chatAiService';

const MAX_HISTORY_TURNS = 12; 

export class ConversationManager {
  private history: ChatTurn[] = [];

  addUserMessage(content: string) {
    this.history.push({ role: 'user', content });
    this.trim();
  }

  addAssistantMessage(content: string) {
    this.history.push({ role: 'assistant', content });
    this.trim();
  }

  getHistory(): ChatTurn[] {
    return this.history;
  }

  private trim() {
    if (this.history.length > MAX_HISTORY_TURNS) {
      this.history = this.history.slice(this.history.length - MAX_HISTORY_TURNS);
    }
  }

  clear() {
    this.history = [];
  }
}