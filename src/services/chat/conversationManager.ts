import { ChatTurn } from './chatAiService';

const MAX_HISTORY_TURNS = 12;
const MAX_FACTS = 6;

export class ConversationManager {
  private history: ChatTurn[] = [];
  private facts: string[] = []; // ← НОВЕ: короткі факти про юзера ("likes Nike", "has a dog")

  addUserMessage(content: string) {
    this.history.push({ role: 'user', content });
    this.trim();
  }

  addAssistantMessage(content: string) {
    this.history.push({ role: 'assistant', content });
    this.trim();
  }

  addFact(fact: string) {
    if (!fact || this.facts.includes(fact)) return;
    this.facts.push(fact);
    if (this.facts.length > MAX_FACTS) this.facts.shift();
  }

  getFacts(): string[] {
    return this.facts;
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
    this.facts = [];
  }
}