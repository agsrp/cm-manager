let scheduledTimes = [];
let notifyAgenda = true;
let notifyIdeas = true;
let lastTriggeredMinute = '';

// Message listener from web app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_LOCAL_NOTIFICATIONS') {
    scheduledTimes = event.data.times || [];
    notifyAgenda = event.data.notify_agenda !== false;
    notifyIdeas = event.data.notify_ideas !== false;
  }
});

// Check every 30 seconds if any scheduled time matches local device time
setInterval(() => {
  if (!scheduledTimes || scheduledTimes.length === 0) return;

  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMin = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${currentHour}:${currentMin}`;

  if (scheduledTimes.includes(timeStr) && lastTriggeredMinute !== timeStr) {
    lastTriggeredMinute = timeStr;

    let bodyMsg = 'Recuerda revisar tus tareas e ideas del día en CM Manager.';
    if (notifyAgenda && notifyIdeas) {
      bodyMsg = 'Tienes recordatorios de agenda e ideas de contenido para revisar hoy.';
    } else if (notifyAgenda) {
      bodyMsg = 'Tienes publicaciones y tareas programadas en tu agenda.';
    } else if (notifyIdeas) {
      bodyMsg = 'Tienes ideas pendientes de producción en tu banco de ideas.';
    }

    self.registration.showNotification('CM Manager - Recordatorio', {
      body: bodyMsg,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      data: { url: '/calendar' },
    });
  }
}, 30000);

self.addEventListener('push', function (event) {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'CM Manager', body: event.data.text() };
    }

    const options = {
      body: data.body || 'Tienes un nuevo mensaje de CM Manager.',
      icon: data.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title || 'CM Manager', options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
