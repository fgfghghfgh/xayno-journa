import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInteractionRequest, callGeminiInteraction, extractInteractionText } from './gemini-interactions.mjs';

test('builds a text interaction with system instruction and chat history', () => {
  const body = buildInteractionRequest({
    model: 'gemini-3.5-flash-lite',
    system: 'Be concise.',
    messages: [
      { role: 'user', content: 'سلام' },
      { role: 'assistant', content: 'سلام، چطور می‌توانم کمک کنم؟' },
    ],
  });
  assert.equal(body.model, 'gemini-3.5-flash-lite');
  assert.equal(body.system_instruction, 'Be concise.');
  assert.deepEqual(body.input, [{
    type: 'text',
    text: 'کاربر: سلام\n\nمربی: سلام، چطور می‌توانم کمک کنم؟',
  }]);
  assert.equal('contents' in body, false);
});

test('preserves image input and requests JSON output when needed', () => {
  const image = { type: 'image', data: 'cG5n', mime_type: 'image/png' };
  const body = buildInteractionRequest({
    model: 'gemini-3.5-flash-lite',
    messages: [{ role: 'user', content: 'این چارت را تحلیل کن.' }],
    extraImages: [image, { inlineData: { mimeType: 'image/png', data: 'invalid' } }],
    jsonOutput: true,
  });
  assert.deepEqual(body.input[1], image);
  assert.equal(body.input.length, 2);
  assert.deepEqual(body.response_format, { type: 'text', mime_type: 'application/json' });
});

test('extracts text from an interaction response', () => {
  assert.equal(extractInteractionText({ output: [{ type: 'text', text: 'پاسخ استاد' }] }), 'پاسخ استاد');
  assert.equal(extractInteractionText({ output_text: '  پاسخ مستقیم  ' }), 'پاسخ مستقیم');
});

test('extracts text from the official REST model_output steps response', () => {
  const response = {
    object: 'interaction',
    status: 'completed',
    steps: [{
      type: 'model_output',
      content: [{ type: 'text', text: 'پاسخ رسمی از ساختار steps.' }],
    }],
  };
  assert.equal(extractInteractionText(response), 'پاسخ رسمی از ساختار steps.');
});

test('maps provider rate limits to an actionable error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 });
  try {
    await assert.rejects(
      callGeminiInteraction({
        apiKey: 'test-key',
        model: 'gemini-3.5-flash-lite',
        messages: [{ role: 'user', content: 'سلام' }],
      }),
      (error) => error.status === 429 && error.message.includes('سهمیه'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('retries temporary high-demand errors with the configured fallback model', async () => {
  const originalFetch = globalThis.fetch;
  const requestedModels = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requestedModels.push(body.model);
    if (requestedModels.length === 1) {
      return new Response(JSON.stringify({ error: { message: 'Model is currently experiencing high demand.' } }), { status: 503 });
    }
    return new Response(JSON.stringify({ output_text: 'پاسخ مدل پشتیبان' }), { status: 200 });
  };
  try {
    const reply = await callGeminiInteraction({
      apiKey: 'test-key',
      model: 'gemini-3.5-flash-lite',
      fallbackModel: 'gemini-3.1-flash-lite',
      messages: [{ role: 'user', content: 'سلام' }],
    });
    assert.equal(reply, 'پاسخ مدل پشتیبان');
    assert.deepEqual(requestedModels, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not retry non-transient provider errors', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({ error: { message: 'Invalid API key.' } }), { status: 400 });
  };
  try {
    await assert.rejects(
      callGeminiInteraction({
        apiKey: 'test-key',
        model: 'gemini-3.5-flash-lite',
        fallbackModel: 'gemini-3.1-flash-lite',
        messages: [{ role: 'user', content: 'سلام' }],
      }),
      (error) => error.status === 502 && error.message === 'Invalid API key.',
    );
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
