import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BEhtMXdAWq6OuFSkA3cfboECo02iH2c39xbazyY7GcJyrG6fOlUjJ94uykDA15Dc2K4ALntMbhb0vwSSPssJN0c";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useNativePush = () => {
  const { user } = useAuth();

  const subscribe = async () => {
    if (!user) return;

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error("Push notifications não suportadas neste navegador.");
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const { endpoint, keys } = subscription.toJSON();
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Erro ao gerar assinatura push.");
      }

      const { error } = await supabase
        .from('push_subscriptions' as any)
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        } as any, { onConflict: 'user_id, endpoint' });

      if (error) throw error;
      
      toast.success("Notificações nativas ativadas!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao ativar notificações: " + err.message);
    }
  };

  return { subscribe };
};
