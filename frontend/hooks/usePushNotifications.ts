import { useEffect, useCallback } from "react";
import backend from "~backend/client";

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  vapidKey: "",
};

let firebaseApp: import("firebase/app").FirebaseApp | null = null;
let messagingInstance: import("firebase/messaging").Messaging | null = null;

async function getFirebaseMessaging() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.messagingSenderId) return null;
  if (messagingInstance) return messagingInstance;
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
  firebaseApp = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  messagingInstance = getMessaging(firebaseApp);
  return { messaging: messagingInstance, getToken, onMessage };
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    if (FIREBASE_CONFIG.apiKey) {
      reg.active?.postMessage({ type: "FIREBASE_CONFIG", config: FIREBASE_CONFIG });
    }
    return reg;
  } catch {
    return null;
  }
}

export function usePushNotifications(token: string | null) {
  const requestAndSaveToken = useCallback(async () => {
    if (!token) return;
    if (!("Notification" in window)) return;
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.vapidKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    await registerServiceWorker();

    try {
      const firebase = await getFirebaseMessaging();
      if (!firebase) return;
      const { messaging, getToken, onMessage } = firebase as {
        messaging: import("firebase/messaging").Messaging;
        getToken: typeof import("firebase/messaging").getToken;
        onMessage: typeof import("firebase/messaging").onMessage;
      };

      const fcmToken = await getToken(messaging, { vapidKey: FIREBASE_CONFIG.vapidKey });
      if (!fcmToken) return;

      const client = backend.with({ auth: async () => ({ authorization: `Bearer ${token}` }) });
      await client.attendance.savePushToken({ token: fcmToken });

      onMessage(messaging, (payload) => {
        if (Notification.permission === "granted") {
          new Notification(payload.notification?.title ?? "GIS KIA", {
            body: payload.notification?.body ?? "",
            icon: "/manifest.json",
          });
        }
      });
    } catch {}
  }, [token]);

  useEffect(() => {
    requestAndSaveToken();
  }, [requestAndSaveToken]);
}
