import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL = 60_000;
const DISMISS_DURATION = 5 * 60_000;

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const currentHash = useRef<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!currentHash.current) {
          currentHash.current = data.version;
        } else if (data.version !== currentHash.current) {
          setUpdateAvailable(true);
        }
      } catch {
        // silently ignore
      }
    };

    fetchVersion();
    const id = setInterval(fetchVersion, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => setDismissed(false), DISMISS_DURATION);
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-primary px-4 py-2.5 text-primary-foreground shadow-lg">
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
      <span className="text-sm font-medium">
        Uma nova versão está disponível!
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        onClick={() => window.location.reload()}
      >
        Atualizar agora
      </Button>
      <button
        onClick={handleDismiss}
        className="ml-1 rounded-full p-1 hover:bg-primary-foreground/20"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
