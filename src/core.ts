// Gordion — Created by @kemalselimkoc
export type Message = { role: 'user' | 'assistant'; content: string };
export type Reply = { text: string; inputTokens: number; outputTokens: number };
export type Provider = (messages: Message[], signal: AbortSignal) => Promise<Reply>;

export class ChatSession {
  private history: Message[] = [];
  private busy = false;
  private requests = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  constructor(private provider: Provider, private maxRequests = 10) {}

  get usage() {
    return { requests: this.requests, inputTokens: this.inputTokens, outputTokens: this.outputTokens };
  }

  reset() {
    if (this.busy) throw new Error('Önce devam eden isteği iptal et.');
    this.history = [];
    // Sohbeti silmek süreç bütçesini sıfırlamaz.
  }

  async send(text: string, signal: AbortSignal): Promise<string> {
    if (this.busy) throw new Error('Bir istek zaten çalışıyor.');
    text = text.trim();
    if (!text || text.length > 4000) throw new Error('Mesaj 1–4000 karakter olmalı.');
    if (signal.aborted) throw new Error('İstek iptal edildi.');
    if (this.requests >= this.maxRequests) throw new Error('Bu çalıştırmanın istek sınırı doldu.');
    const input: Message[] = [...this.history, { role: 'user', content: text }];
    if (input.reduce((n, m) => n + m.content.length, 0) > 24000)
      throw new Error('Oturum bağlamı doldu. /reset ile yeni sohbet aç.');
    this.busy = true;
    this.requests++;
    try {
      const reply = await this.provider(input, signal);
      this.inputTokens += reply.inputTokens;
      this.outputTokens += reply.outputTokens;
      if (signal.aborted) throw new Error('İstek iptal edildi.');
      if (!reply.text.trim()) throw new Error('Metin yanıtı alınamadı; çıktı sınırı yetersiz olabilir.');
      this.history = [...input, { role: 'assistant', content: reply.text }];
      return reply.text;
    } finally {
      this.busy = false;
    }
  }
}
