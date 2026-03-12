import { useState, useEffect, useCallback } from "react";
const OFFLINE_QUEUE_DB = "gis-kia-offline";
const OFFLINE_QUEUE_STORE = "clock-queue";
export interface QueuedAction { id: number; action: "in" | "out"; timestamp: string; }
function openDB(): Promise<IDBDatabase> { return new Promise((res, rej) => { const r = indexedDB.open(OFFLINE_QUEUE_DB, 1); r.onupgradeneeded = (e) => (e.target as IDBOpenDBRequest).result.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: "id", autoIncrement: true }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function getQueuedActions(): Promise<QueuedAction[]> { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly"); const r = tx.objectStore(OFFLINE_QUEUE_STORE).getAll(); r.onsuccess = () => res((r.result as any[]).map((x) => ({ id: x.id, action: x.body?.action ?? "in", timestamp: x.timestamp }))); r.onerror = () => rej(r.error); }); }
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(0);
  const refreshQueue = useCallback(async () => { try { setQueuedActions(await getQueuedActions()); } catch {} }, []);
  useEffect(() => { refreshQueue(); }, [refreshQueue]);
  useEffect(() => {
    const online = () => { setIsOnline(true); if (navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({ type: "RETRY_QUEUE" }); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "OFFLINE_QUEUE_UPDATED") refreshQueue();
      if (e.data?.type === "QUEUE_SYNCED") { setSyncing(false); setLastSynced(e.data.synced); refreshQueue(); setTimeout(() => setLastSynced(0), 5000); }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [refreshQueue]);
  const manualSync = useCallback(async () => { if (!isOnline || !navigator.serviceWorker?.controller) return; setSyncing(true); navigator.serviceWorker.controller.postMessage({ type: "RETRY_QUEUE" }); setTimeout(() => setSyncing(false), 5000); }, [isOnline]);
  return { isOnline, queuedActions, queueCount: queuedActions.length, syncing, lastSynced, manualSync, refreshQueue };
}
