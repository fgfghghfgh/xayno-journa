const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export function buildInteractionRequest({ model, system, messages, extraImages = [], jsonOutput = false }) {
  const transcript = (messages || [])
    .filter((item) => item && ['user', 'assistant'].includes(item.role))
    .map((item) => `${item.role === 'assistant' ? 'مربی' : 'کاربر'}: ${String(item.content || '').slice(0, 60_000)}`)
    .join('\n\n');
  const input = [{ type: 'text', text: transcript }];
  for (const image of extraImages) {
    if (image?.type === 'image' && typeof image.data === 'string' && typeof image.mime_type === 'string') {
      input.push(image);
    }
  }
  const body = { model, input };
  if (system) body.system_instruction = system;
  if (jsonOutput) body.response_format = { type: 'text', mime_type: 'application/json' };
  return body;
}

export function extractInteractionText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const textParts = [];
  const collectText = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collectText);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (value.type === 'text' && typeof value.text === 'string') {
      textParts.push(value.text);
      return;
    }
    if (Array.isArray(value.content)) collectText(value.content);
    if (Array.isArray(value.steps)) collectText(value.steps);
    if (Array.isArray(value.output)) collectText(value.output);
  };
  collectText(payload?.output);
  collectText(payload?.steps);
  return textParts.join('').trim();
}

async function requestInteraction({ apiKey, model, system, messages, extraImages, jsonOutput }) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildInteractionRequest({ model, system, messages, extraImages, jsonOutput })),
    });
  } catch {
    const error = new Error('سرویس هوش مصنوعی در دسترس نیست یا زمان پاسخ تمام شد.');
    error.status = 503;
    error.retryable = true;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = payload.error?.message || '';
    const retryable = response.status === 503 || /(overload|high demand|temporarily unavailable)/i.test(providerMessage);
    const message = retryable
      ? 'مدل اصلی هوش مصنوعی موقتاً شلوغ است؛ در حال امتحان مدل پشتیبان.'
      : response.status === 429
        ? 'سهمیهٔ هوش مصنوعی تمام شده یا محدود شده است؛ کمی بعد دوباره تلاش کن.'
        : providerMessage || 'ارتباط با سرویس هوش مصنوعی ناموفق بود.';
    const error = new Error(message);
    error.status = response.status === 429 ? 429 : response.status === 503 ? 503 : 502;
    error.retryable = retryable;
    throw error;
  }
  const text = extractInteractionText(payload);
  if (!text) {
    const error = new Error(
      payload.status === 'failed'
        ? 'درخواست هوش مصنوعی ناموفق شد؛ دوباره تلاش کن.'
        : 'سرویس هوش مصنوعی پاسخ متنی برنگرداند.',
    );
    error.status = 502;
    error.retryable = payload.status === 'failed';
    throw error;
  }
  return text;
}

export async function callGeminiInteraction({
  apiKey,
  model,
  fallbackModel,
  system,
  messages,
  extraImages = [],
  jsonOutput = false,
}) {
  const request = { apiKey, system, messages, extraImages, jsonOutput };
  try {
    return await requestInteraction({ ...request, model });
  } catch (error) {
    if (!error.retryable || !fallbackModel || fallbackModel === model) throw error;
    console.warn(`Gemini model ${model} is temporarily unavailable; retrying with ${fallbackModel}.`);
    return requestInteraction({ ...request, model: fallbackModel });
  }
}
