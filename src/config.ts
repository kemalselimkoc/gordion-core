export function readConfig(env: NodeJS.ProcessEnv, demo: boolean) {
  function integer(key: string, fallback: number, min: number, max: number) {
    const raw = env[key];
    const value = raw === undefined ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max)
      throw new Error(`${key}, ${min}–${max} arasında tam sayı olmalı.`);
    return value;
  }
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';
  const model = env.OPENAI_MODEL?.trim() ?? '';
  if (!demo && (!apiKey || !model))
    throw new Error('Yerel .env dosyasında OPENAI_API_KEY ve OPENAI_MODEL ayarla; veya npm run demo kullan.');
  return {
    apiKey, model,
    maxRequests: integer('GORDION_MAX_REQUESTS', 10, 1, 100),
    maxOutputTokens: integer('GORDION_MAX_OUTPUT_TOKENS', 512, 64, 4096),
    timeoutMs: integer('GORDION_TIMEOUT_MS', 30000, 1000, 120000),
  };
}
