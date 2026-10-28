self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: 'ژورنال جدید ثبت شد', body: 'یک ژورنال تازه به XAYNO اضافه شد.' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'ژورنال جدید ثبت شد', {
    body: payload.body || 'یک ژورنال تازه به XAYNO اضافه شد.',
    icon: payload.icon || '/xayno-icon.png',
    badge: payload.badge || '/xayno-badge.png',
    tag: payload.tag || 'xayno-journal-new',
    data: { url: payload.url || '/', ...(payload.data || {}) },
    vibrate: [120, 60, 120],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
