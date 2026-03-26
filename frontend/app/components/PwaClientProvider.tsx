"use client";

import { useEffect, useState } from "react";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: Event;
  }
}

export default function PwaClientProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showInstall, setShowInstall] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotificationStatus(result);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt as any;
    prompt.prompt();
    await prompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <div className="rounded-xl bg-amber-100 px-4 py-2 text-xs text-amber-700 shadow">
          You are offline. Some features may be unavailable.
        </div>
      )}
      {installPrompt && showInstall && (
        <button
          onClick={handleInstall}
          className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow"
        >
          Install App
        </button>
      )}
      {notificationStatus !== "granted" && showNotifications && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow">
          <button onClick={requestNotificationPermission}>Enable Notifications</button>
          <button
            onClick={() => setShowNotifications(false)}
            className="text-white/70"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {installPrompt && showInstall && (
        <button
          onClick={() => setShowInstall(false)}
          className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow"
        >
          Maybe later
        </button>
      )}
    </div>
  );
}