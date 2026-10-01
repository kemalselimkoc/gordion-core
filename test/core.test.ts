import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatSession, type Message } from '../src/core.js';
import { readConfig } from '../src/config.js';
import { openAIProvider, safeError } from '../src/provider.js';

const signal = () => new AbortController().signal;
const reply = { text: 'Merhaba', inputTokens: 4, outputTokens: 2 };

test('başarılı yanıtlar sonraki isteğe taşınır; reset kullanım sınırını sıfırlamaz', async () => {
  const seen: Message[][] = [];
  const chat = new ChatSession(async input => { seen.push(input); return reply; }, 2);
  await chat.send('Ben Kemal', signal());
  await chat.send('Adım ne?', signal());
  assert.deepEqual(seen[1]?.map(m => m.role), ['user', 'assistant', 'user']);
  assert.equal(seen[1]?.[0]?.content, 'Ben Kemal');
  chat.reset();
  await assert.rejects(chat.send('Yeni', signal()), /sınırı doldu/);
  assert.deepEqual(chat.usage, { requests: 2, inputTokens: 8, outputTokens: 4 });
});

test('başarısız istek bağlama girmez fakat istek bütçesinden düşer', async () => {
  let attempts = 0;
  const chat = new ChatSession(async input => {
    if (++attempts === 1) throw new Error('network');
    assert.equal(input.length, 1);
    return reply;
  });
  await assert.rejects(chat.send('Başarısız', signal()));
  await chat.send('Tekrar', signal());
  assert.equal(chat.usage.requests, 2);
});

test('boş, büyük ve önceden iptal edilen mesaj API çağırmaz', async () => {
  const chat = new ChatSession(async () => { assert.fail('provider çağrılmamalı'); });
  await assert.rejects(chat.send(' ', signal()));
  await assert.rejects(chat.send('a'.repeat(4001), signal()));
  await assert.rejects(chat.send('Merhaba', AbortSignal.abort()));
  assert.equal(chat.usage.requests, 0);
});

test('eşzamanlı çağrı reddedilir ve iptal sonrası kilit açılır', async () => {
  const chat = new ChatSession(async (_input, abort) => new Promise((_resolve, reject) => {
    abort.addEventListener('abort', () => reject(new Error('cancel')), { once: true });
  }));
  const controller = new AbortController();
  const first = chat.send('İlk', controller.signal);
  await assert.rejects(chat.send('İkinci', signal()), /zaten/);
  assert.throws(() => chat.reset());
  controller.abort();
  await assert.rejects(first, /cancel/);
  assert.doesNotThrow(() => chat.reset());
});

test('bağlam sınırı aşıldığında provider çağrılmaz', async () => {
  const chat = new ChatSession(async () => ({ ...reply, text: 'a'.repeat(24000) }));
  await chat.send('a', signal());
  await assert.rejects(chat.send('b', signal()), /bağlamı doldu/);
  assert.equal(chat.usage.requests, 1);
});

test('API ayarı ve sayısal sınırlar başlangıçta doğrulanır', () => {
  assert.throws(() => readConfig({}, false), /OPENAI_API_KEY/);
  for (const value of ['0', '-1', 'NaN', '2.5', '101'])
    assert.throws(() => readConfig({ GORDION_MAX_REQUESTS: value }, true));
  assert.equal(readConfig({}, true).maxRequests, 10);
});

test('SDK isteği sabit endpoint, store:false, model ve çıktı sınırı içerir', async () => {
  const config = readConfig({ OPENAI_API_KEY: 'test-placeholder', OPENAI_MODEL: 'test-model' }, false);
  const provider = openAIProvider(config, async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.model, 'test-model');
    assert.equal(body.max_output_tokens, 512);
    assert.equal(body.tools, undefined);
    assert.equal(body.input[0].content, 'Merhaba');
    return new Response(JSON.stringify({
      id: 'resp_test', object: 'response', status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Selam', annotations: [] }] }],
      usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
    }), { headers: { 'content-type': 'application/json' } });
  });
  assert.deepEqual(await provider([{ role: 'user', content: 'Merhaba' }], signal()), { text: 'Selam', inputTokens: 3, outputTokens: 2 });
});

test('429 tekrar denenmez ve ham API hata içeriği kullanıcıya sızmaz', async () => {
  let calls = 0;
  const provider = openAIProvider(readConfig({ OPENAI_API_KEY: 'test-placeholder', OPENAI_MODEL: 'test-model' }, false), async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: 'PRIVATE_PAYLOAD', type: 'rate_limit_error' } }), {
      status: 429, headers: { 'content-type': 'application/json' },
    });
  });
  try { await provider([{ role: 'user', content: 'Hi' }], signal()); assert.fail('hata bekleniyordu'); }
  catch (error) { assert.match(safeError(error), /Kota/); assert.doesNotMatch(safeError(error), /PRIVATE/); }
  assert.equal(calls, 1);
});

test('SDK timeout anlaşılır hataya dönüşür ve tekrar çağrı yapmaz', async () => {
  let calls = 0;
  const provider = openAIProvider({ ...readConfig({ OPENAI_API_KEY: 'test-placeholder', OPENAI_MODEL: 'test-model' }, false), timeoutMs: 20 }, async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  });
  await assert.rejects(provider([{ role: 'user', content: 'Hi' }], signal()), error => {
    assert.match(safeError(error), /zaman aşımına/); return true;
  });
  assert.equal(calls, 1);
});
