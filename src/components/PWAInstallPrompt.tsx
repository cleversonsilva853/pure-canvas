import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useState } from 'react';

const PWAInstallPrompt = () => {
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Instalar FinControl</p>
          <p className="text-xs text-muted-foreground">Acesse rápido pela tela inicial</p>
        </div>
        <Button size="sm" onClick={installPWA} className="flex-shrink-0">
          Instalar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
