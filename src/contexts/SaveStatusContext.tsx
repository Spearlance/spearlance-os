import { createContext, useState, useCallback, useRef, ReactNode } from "react";

export type SaveStatusType = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusContextType {
  status: SaveStatusType;
  errorMessage?: string;
  setSaveStatus: (status: SaveStatusType, errorMessage?: string) => void;
  clearError: () => void;
}

export const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SaveStatusType>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setSaveStatus = useCallback((newStatus: SaveStatusType, message?: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus(newStatus);
    
    if (newStatus === 'error') {
      setErrorMessage(message);
    } else {
      setErrorMessage(undefined);
    }

    // Auto-clear 'saved' status after 3 seconds
    if (newStatus === 'saved') {
      timeoutRef.current = setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }
  }, []);

  const clearError = useCallback(() => {
    setStatus('idle');
    setErrorMessage(undefined);
  }, []);

  return (
    <SaveStatusContext.Provider value={{ status, errorMessage, setSaveStatus, clearError }}>
      {children}
    </SaveStatusContext.Provider>
  );
}
