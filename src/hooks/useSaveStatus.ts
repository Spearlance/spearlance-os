import { useContext } from "react";
import { SaveStatusContext, SaveStatusType } from "@/contexts/SaveStatusContext";

export function useSaveStatus() {
  const context = useContext(SaveStatusContext);
  
  if (context === undefined) {
    // Return a no-op version if used outside provider (for gradual migration)
    return {
      status: 'idle' as SaveStatusType,
      errorMessage: undefined,
      setSaveStatus: () => {},
      clearError: () => {},
    };
  }
  
  return context;
}
