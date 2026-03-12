import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Register offline service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-offline.js").then((reg) => {
      console.log("Offline SW registered:", reg.scope);
      // Register background sync if supported
      if ("sync" in reg) {
        (reg as any).sync.register("clock-sync").catch(() => {});
      }
    }).catch((err) => console.error("Offline SW failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
