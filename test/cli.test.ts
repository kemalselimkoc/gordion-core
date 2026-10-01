import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('demo CLI iki tur, reset ve çıkış akışını ağsız tamamlar', async () => {
  const child = spawn(process.execPath, ['dist/src/cli.js', '--demo'], {
    stdio: 'pipe', windowsHide: true,
    env: { ...process.env, GORDION_MAX_REQUESTS: '10' },
  });
  let output = '';
  let phase = 0;
  const timer = setTimeout(() => child.kill(), 8000);
  child.stdout.on('data', data => {
    output += String(data);
    if (phase === 0 && output.includes('/cancel iptal')) { phase++; child.stdin.write('Merhaba\n'); }
    else if (phase === 1 && output.includes('mesajı: 1.')) { phase++; child.stdin.write('Tekrar merhaba\n'); }
    else if (phase === 2 && output.includes('mesajı: 2.')) { phase++; child.stdin.write('/reset\n/usage\n/exit\n'); }
  });
  let stderr = '';
  child.stderr.on('data', data => { stderr += String(data); });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject); child.once('close', resolve);
  }).finally(() => clearTimeout(timer));
  assert.equal(code, 0, stderr + output);
  assert.equal(phase, 3, output);
  assert.match(output, /Sohbet silindi/);
  assert.match(output, /requests: 2/);
});
