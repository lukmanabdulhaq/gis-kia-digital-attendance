importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Will be configured when the app sends FIREBASE_CONFIG message
let messaging = null;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    try {
      const app = firebase.initializeApp(event.data.config);
      messaging = firebase.messaging(app);

      messaging.onBackgroundMessage((payload) => {
        console.log("📩 Background message received:", payload);
        const notificationTitle = payload.notification?.title ?? "GIS KIA Roll Call";
        const notificationOptions = {
          body: payload.notification?.body ?? "Please clock in immediately.",
          icon: "/manifest.json",
          badge: "/manifest.json",
          tag: "gis-muster",
          data: payload.data ?? {},
          requireInteraction: true,
          actions: [{ action: "clock-in", title: "⏰ Clock In Now" }],
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    } catch (e) {
      console.error("SW Firebase init error:", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.action === "clock-in" ? "/clock" : "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
