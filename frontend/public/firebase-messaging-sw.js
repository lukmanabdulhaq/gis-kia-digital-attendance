importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title ?? "GIS KIA Roll Call";
      const notificationOptions = {
        body: payload.notification?.body ?? "Please clock in immediately.",
        icon: "/manifest.json",
        badge: "/manifest.json",
        tag: "gis-muster",
        data: payload.data ?? {},
        requireInteraction: true,
        actions: [{ action: "clock-in", title: "Clock In Now" }],
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "clock-in") {
    event.waitUntil(clients.openWindow("/clock"));
  } else {
    event.waitUntil(clients.openWindow("/"));
  }
});
