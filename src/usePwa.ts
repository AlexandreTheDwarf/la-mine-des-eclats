import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Workbox manages the cache. Updates stay waiting until the player accepts
 * and their current progress is safely flushed; never reload during a click. */
export function usePwa(flush: () => boolean) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const registration = useRef<ServiceWorkerRegistration>();
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, value) {
      registration.current = value;
      if (value?.active) setCached(true);
    },
    onRegisterError() { setError("Mode hors connexion indisponible pour le moment."); },
  });

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installedEvent = () => { setInstalled(true); setInstallPrompt(null); };
    const checkUpdate = () => {
      if (!document.hidden && navigator.onLine) void registration.current?.update().catch(() => {});
    };
    const timer = window.setInterval(checkUpdate, 60 * 60 * 1_000);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installedEvent);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installedEvent);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch { setError("Installation non disponible dans ce navigateur."); }
  };

  const update = async () => {
    if (!flush()) return;
    try { await updateServiceWorker(true); }
    catch { setError("Mise à jour interrompue. La partie est sauvegardée."); }
  };
  return { canInstall: !!installPrompt, installed, offlineReady: offlineReady || cached, needRefresh, error, install, update };
}
