// Service worker of HazardWatch. It only shows the alert notifications the
// worker pushes, and opens the page they point to: pages are not cached.

self.addEventListener("push", (event) => {
  /** @type {{ title?: string, body?: string, path?: string }} */
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // A message that is not JSON still deserves a notification.
  }

  event.waitUntil(
    self.registration.showNotification(message.title ?? "HazardWatch", {
      body: message.body ?? "New alerts in your watch zones.",
      icon: "/icons/192",
      data: { path: message.path ?? "/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.path ?? "/alerts", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url === url);
      if (open) {
        await open.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
