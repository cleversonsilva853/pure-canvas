import { useState } from 'react';

export function useOneSignal() {
  const [hasPermission] = useState<boolean>(false);
  const [isInitialized] = useState<boolean>(false);

  const requestPermission = async () => {
    console.warn("OneSignal is not configured");
    return false;
  };

  return { requestPermission, hasPermission, isInitialized };
}
