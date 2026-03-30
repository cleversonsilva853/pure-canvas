import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID"; // Substituir pelo ID real

export const initOneSignal = async () => {
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "OneSignalSDKWorker.js",
    });
    console.log("OneSignal initialized");
  } catch (err) {
    console.error("Error initializing OneSignal:", err);
  }
};

export const loginOneSignal = async (userId: string) => {
  try {
    await OneSignal.login(userId);
    console.log("OneSignal logged in with external_id:", userId);
  } catch (err) {
    console.error("Error logging in OneSignal:", err);
  }
};

export const logoutOneSignal = async () => {
  try {
    await OneSignal.logout();
    console.log("OneSignal logged out");
  } catch (err) {
    console.error("Error logging out OneSignal:", err);
  }
};
