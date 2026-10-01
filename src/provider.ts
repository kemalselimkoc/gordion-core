import OpenAI from 'openai';
import type { Provider } from './core.js';
import type { readConfig } from './config.js';

export function openAIProvider(config: ReturnType<typeof readConfig>, fetcher?: typeof fetch): Provider {
  const client = new OpenAI({
    apiKey: config.apiKey, baseURL: 'https://api.openai.com/v1',
    maxRetries: 0, timeout: config.timeoutMs, fetch: fetcher,
  });
  return async (messages, signal) => {
    const response = await client.responses.create({
      model: config.model,
      instructions: 'Sen Gordion, Türkçe doğal ve açık konuşan kişisel asistansın. Bu sürüm yalnızca sohbet eder. Cihaz, dosya veya uygulama işlemi yapamazsın; yapılmış gibi söyleme.',
      input: messages,
      store: false,
      max_output_tokens: config.maxOutputTokens,
    }, { signal });
    return {
      text: response.output_text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  };
}

export const demoProvider: Provider = async messages => ({
  text: `[DEMO — AI bağlantısı yok] Mesajını aldım. Bu oturumdaki kullanıcı mesajı: ${messages.filter(m => m.role === 'user').length}.`,
  inputTokens: 0, outputTokens: 0,
});

export function safeError(error: unknown): string {
  if (error instanceof OpenAI.APIUserAbortError) return 'İstek iptal edildi.';
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'Yanıt zaman aşımına uğradı.';
  if (error instanceof OpenAI.APIConnectionError) return 'OpenAI bağlantısı kurulamadı.';
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) return 'API anahtarı kabul edilmedi. Yerel ayarını kontrol et.';
    if (error.status === 429) return 'Kota veya hız sınırına ulaşıldı. Otomatik tekrar yapılmadı.';
    if (error.status === 403 || error.status === 404) return 'Model veya proje erişimini kontrol et.';
    return 'OpenAI isteği başarısız oldu. Model ve API ayarlarını kontrol et.';
  }
  return 'İstek tamamlanamadı.';
}
