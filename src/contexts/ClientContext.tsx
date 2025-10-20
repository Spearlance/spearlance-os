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
  logo_url?: string;
  account_type?: string;
  billing_method?: 'stripe' | 'direct' | 'free';
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_status?: string;
  company_name?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  billing_plan_id?: string;
  billing_plans?: {
    name: string;
    price_monthly: number;
    max_team_members: number | null;
  };
}

interface ClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clients: Client[];
  loading: boolean;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom setter that persists to localStorage
  const setSelectedClientWithPersistence = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      localStorage.setItem('selectedClientId', client.id);
    } else {
      localStorage.removeItem('selectedClientId');
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      // Fetch current user's profile to check role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, associated_client_ids')
        .eq('id', user.id)
        .maybeSingle();

      let query = supabase.from('clients').select(`
        *,
        billing_plans(name, price_monthly, max_team_members)
      `).order('name');

      // If not admin, filter by associated_client_ids
      if (profile?.role !== 'admin' && profile?.associated_client_ids) {
        query = query.in('id', profile.associated_client_ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      setClients(data as Client[] || []);
      
      // Auto-select client from localStorage or first client if none selected
      const savedClientId = localStorage.getItem('selectedClientId');
      if (!selectedClient && data && data.length > 0) {
        const clientToSelect = savedClientId 
          ? data.find(c => c.id === savedClientId) || data[0]
          : data[0];
        setSelectedClient(clientToSelect as Client);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshClients = async () => {
    const currentSelectedId = selectedClient?.id;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, associated_client_ids')
        .eq('id', user.id)
        .maybeSingle();

      let query = supabase.from('clients').select(`
        *,
        billing_plans(name, price_monthly, max_team_members)
      `).order('name');

      if (profile?.role !== 'admin' && profile?.associated_client_ids) {
        query = query.in('id', profile.associated_client_ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      setClients(data as Client[] || []);
      
      // If we had a selected client, re-select the refreshed version
      if (currentSelectedId && data) {
        const refreshedClient = data.find(c => c.id === currentSelectedId);
        if (refreshedClient) {
          setSelectedClient(refreshedClient as Client);
        }
      }
    } catch (error) {
      console.error('Error refreshing clients:', error);
    }
  };

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient: setSelectedClientWithPersistence,
        clients,
        loading,
        refreshClients,
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
