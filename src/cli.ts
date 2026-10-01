// Gordion — Created by @kemalselimkoc
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';
import { ChatSession } from './core.js';
import { readConfig } from './config.js';
import { demoProvider, openAIProvider, safeError } from './provider.js';

function main() {
  const demo = process.argv.includes('--demo');
  const config = readConfig(process.env, demo);
  const provider = demo ? demoProvider : openAIProvider(config);
  const session = new ChatSession(async (messages, signal) => {
    try { return await provider(messages, signal); }
    catch (error) { throw new Error(safeError(error)); }
  }, config.maxRequests);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let active: AbortController | undefined;
  let closed = false;
  const prompt = () => { if (!closed && process.stdin.isTTY) rl.prompt(); };
  console.log(`Gordion | ${demo ? 'DEMO: API çağrısı yapılmaz' : 'OpenAI: ücretli API kullanımı'}\n/exit çıkış · /reset sohbeti sil · /usage kullanım · /cancel iptal`);
  rl.setPrompt('Sen > ');
  rl.on('line', line => {
    const text = line.trim();
    if (text === '/exit') { active?.abort(); rl.close(); return; }
    if (text === '/cancel') { active?.abort(); if (!active) prompt(); return; }
    if (text === '/usage') { console.log(session.usage); if (!active) prompt(); return; }
    if (active) { console.log('Yanıt bekleniyor. İptal etmek için /cancel yaz.'); return; }
    if (text === '/reset') { session.reset(); console.log('Sohbet silindi; kullanım sınırı korundu.'); prompt(); return; }
    if (!text) { prompt(); return; }
    const controller = new AbortController();
    active = controller;
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    void session.send(text, controller.signal)
      .then(reply => { if (!closed) console.log(`Gordion > ${stripVTControlCharacters(reply)}`); })
      .catch((error: Error) => { if (!closed) console.log(controller.signal.aborted ? 'İstek iptal edildi veya zaman aşımına uğradı.' : error.message); })
      .finally(() => { clearTimeout(timer); active = undefined; prompt(); });
  });
  rl.on('SIGINT', () => { if (active) active.abort(); else rl.close(); });
  rl.on('close', () => { closed = true; active?.abort(); process.stdin.destroy(); });
  prompt();
}

try { main(); }
catch (error) { console.error(error instanceof Error ? error.message : 'Başlatılamadı.'); process.exitCode = 1; }
