const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function telegramHmac(keyBytes, value) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

export async function authenticateTelegram(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN) return { error: json({ message: 'مینی‌اپ هنوز به توکن ربات تلگرام متصل نشده است.' }, 503) };
  const authorization = request.headers.get('Authorization') || '';
  const initData = authorization.startsWith('tma ') ? authorization.slice(4) : '';
  if (!initData || initData.length > 16_384) return { error: json({ message: 'این ژورنال فقط از داخل مینی‌اپ تلگرام قابل استفاده است.' }, 401) };

  const params = new URLSearchParams(initData);
  const entries = [...params.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    return { error: json({ message: 'اطلاعات ورود تلگرام تکراری یا نامعتبر است.' }, 401) };
  }
  const receivedHash = params.get('hash') || '';
  const authDate = Number(params.get('auth_date'));
  if (!/^[\da-f]{64}$/i.test(receivedHash) || !Number.isInteger(authDate)) {
    return { error: json({ message: 'اطلاعات ورود تلگرام معتبر نیست؛ مینی‌اپ را دوباره باز کن.' }, 401) };
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authDate > nowSeconds + 30 || nowSeconds - authDate > 86_400) {
    return { error: json({ message: 'اطلاعات ورود تلگرام منقضی شده؛ مینی‌اپ را دوباره باز کن.' }, 401) };
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = await telegramHmac(new TextEncoder().encode('WebAppData'), env.TELEGRAM_BOT_TOKEN);
  const expectedHash = bytesToHex(await telegramHmac(secretKey, dataCheckString));
  if (!constantTimeEqual(expectedHash, receivedHash.toLowerCase())) {
    return { error: json({ message: 'امضای تلگرام تأیید نشد؛ فقط از دکمهٔ خود ربات وارد شو.' }, 401) };
  }

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return { error: json({ message: 'اطلاعات حساب تلگرام قابل خواندن نیست.' }, 401) };
  }
  if (!user || !/^\d{1,20}$/.test(String(user.id || ''))) {
    return { error: json({ message: 'شناسهٔ کاربر تلگرام در اطلاعات ورود وجود ندارد.' }, 401) };
  }
  return { userId: String(user.id), user: { id: String(user.id), firstName: String(user.first_name || '').slice(0, 100) } };
}
