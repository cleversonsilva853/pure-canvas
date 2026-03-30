self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "InforControl Lembrete";
      const options = {
        body: data.body || "",
        icon: '/favicon.ico', // Ajuste para o ícone do PWA se disponível (ex: /icon-192x192.png)
        badge: '/favicon.ico',
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
      // Focar janela já aberta
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Ou abrir uma nova aba
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
