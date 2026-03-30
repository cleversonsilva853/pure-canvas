import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';

export function useOneSignal() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = () => {
      if (OneSignal.initialized) {
        setIsInitialized(true);
        // Note: OneSignal.Notifications might be undefined before initialization
        if (OneSignal.Notifications) {
          setHasPermission(OneSignal.Notifications.permission);
        }
      }
    };

    // Check periodically for initialization if it's lagging
    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    if (!OneSignal.initialized) {
      console.warn("OneSignal is not initialized yet");
      return false;
    }
    try {
      await OneSignal.Slidedown.promptPush();
      const permission = OneSignal.Notifications.permission;
      setHasPermission(permission);
      return permission;
    } catch (error) {
      console.error("Error requesting OneSignal permission:", error);
      return false;
    }
  };

  return { requestPermission, hasPermission, isInitialized };
}
