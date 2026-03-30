self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "Lembrete InforControl";
      const options = {
        body: data.body || "",
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        requireInteraction: true,
        silent: false,
        data: data.data || { url: '/notifications' }
      };
      
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("Erro ao fazer parse dos dados do Web Push", e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
