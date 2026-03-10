import { useEffect, useCallback } from "react";
import backend from "~backend/client";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4Wmj8mBp0cGYpSEE5lMXXOsL5QCFmUyg",
  authDomain: "gis-kia-digital-attendance.firebaseapp.com",
  projectId: "gis-kia-digital-attendance",
  storageBucket: "gis-kia-digital-attendance.firebasestorage.app",
  messagingSenderId: "756395028845",
  appId: "1:756395028845:web:3d17e95a8b6770d74aaa64",
  vapidKey: "BErna1HBYoA5dz2ZU46cFaF1caDeXYDsqXfFvs8DOebywHHKyh_tgJf4APahmjsynpoHCx2ldkp7KLpOu4dFhXQ",
};

let messagingInstance: import("firebase/messaging").Messaging | null = null;

async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const { getMessaging } = await import("firebase/messaging");
  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active) {
      console.log("✅ Reusing existing service worker");
      return existing;
    }
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    await new Promise(resolve => setTimeout(resolve, 1000));
    const sw = reg.active ?? reg.waiting ?? reg.installing;
    sw?.postMessage({ type: "FIREBASE_CONFIG", config: FIREBASE_CONFIG });
    return reg;
  } catch (e) {
    console.error("SW registration failed:", e);
    return null;
  }
}

export function usePushNotifications(token: string | null) {
  const requestAndSaveToken = useCallback(async () => {
    if (!token) return;
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return;
    }

    console.log("🔧 Registering service worker...");
    await registerServiceWorker();

    try {
      const { getToken, onMessage } = await import("firebase/messaging");
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      console.log("🔧 Getting FCM token...");
      const fcmToken = await getToken(messaging, {
        vapidKey: FIREBASE_CONFIG.vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (!fcmToken) {
        console.error("❌ No FCM token returned");
        return;
      }

      console.log("✅ FCM Token obtained:", fcmToken.substring(0, 20) + "...");

      const client = backend.with({ auth: async () => ({ authorization: `Bearer ${token}` }) });
      await client.attendance.savePushToken({ token: fcmToken });
      console.log("✅ FCM Token saved to backend!");

      onMessage(messaging, (payload) => {
        console.log("📩 Foreground message:", payload);
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(payload.notification?.title ?? "GIS KIA Roll Call", {
            body: payload.notification?.body ?? "Please clock in immediately.",
            icon: "/manifest.json",
            requireInteraction: true,
          });
        });
      });
    } catch (e) {
      console.error("❌ FCM setup error:", e);
    }
  }, [token]);

  useEffect(() => {
    requestAndSaveToken();
  }, [requestAndSaveToken]);
}
