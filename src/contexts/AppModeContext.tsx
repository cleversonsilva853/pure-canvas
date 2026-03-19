import { createContext, useContext, useState, ReactNode } from 'react';

export type AppMode = 'personal' | 'business' | 'couple';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'personal',
  setMode: () => {},
});

export const useAppMode = () => useContext(AppModeContext);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>(() => {
    return (localStorage.getItem('app-mode') as AppMode) || 'personal';
  });

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem('app-mode', newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode: handleSetMode }}>
      {children}
    </AppModeContext.Provider>
  );
};
