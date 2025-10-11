import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  status: string;
  website_url?: string;
  oviond_url?: string;
  drive_folder_url?: string;
  canva_folder_url?: string;
}

interface ClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clients: Client[];
  loading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      setClients(data || []);
      
      // Auto-select first client if none selected
      if (!selectedClient && data && data.length > 0) {
        setSelectedClient(data[0]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
        clients,
        loading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
};
