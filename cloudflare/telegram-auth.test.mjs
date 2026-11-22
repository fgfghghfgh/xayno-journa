import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { authenticateTelegram } from './telegram-auth.mjs';

const BOT_TOKEN = '123456:unit-test-only-not-a-real-bot-token';

function signedInitData({ authDate = Math.floor(Date.now() / 1000), user = { id: 987654321, first_name: 'Test' }, extra = {} } = {}) {
  const params = new URLSearchParams({ ...extra, auth_date: String(authDate), user: JSON.stringify(user) });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return `${params}&hash=${hash}`;
}

function authenticate(initData, token = BOT_TOKEN) {
  const request = new Request('https://journal.example/api/me', {
    headers: { Authorization: `tma ${initData}` },
  });
  return authenticateTelegram(request, { TELEGRAM_BOT_TOKEN: token });
}

test('accepts a valid Telegram signature and extracts only the user identity', async () => {
  const result = await authenticate(signedInitData());
  assert.deepEqual(result, { userId: '987654321', user: { id: '987654321', firstName: 'Test' } });
});

test('includes Telegram signature metadata when validating the bot-token HMAC', async () => {
  const result = await authenticate(signedInitData({ extra: { signature: 'telegram-ed25519-signature' } }));
  assert.deepEqual(result, { userId: '987654321', user: { id: '987654321', firstName: 'Test' } });
});

test('rejects altered initData', async () => {
  const result = await authenticate(`${signedInitData()}&query_id=altered`);
  assert.equal(result.error.status, 401);
});

test('rejects stale initData', async () => {
  const result = await authenticate(signedInitData({ authDate: Math.floor(Date.now() / 1000) - 86_401 }));
  assert.equal(result.error.status, 401);
});

test('rejects duplicate fields', async () => {
  const result = await authenticate(`${signedInitData()}&user=${encodeURIComponent(JSON.stringify({ id: 42 }))}`);
  assert.equal(result.error.status, 401);
});

test('fails closed until the bot token is configured', async () => {
  const result = await authenticate(signedInitData(), '');
  assert.equal(result.error.status, 503);
});
