import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { CalProvider as CalAtomsProvider } from "@calcom/atoms";
import "@calcom/atoms/globals.min.css";
import { supabase } from "@/integrations/supabase/client";

interface CalProviderProps {
  children: ReactNode;
}

interface CalContextValue {
  isCalReady: boolean;
  isLoading: boolean;
}

const CalContext = createContext<CalContextValue>({ isCalReady: false, isLoading: true });

export const useCalReady = () => useContext(CalContext);

export function CalProvider({ children }: CalProviderProps) {
  const [accessToken, setAccessToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserToken = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("cal_access_token, cal_token_expires_at, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
        }

        // Only provide access token for FMM and Admin users who have managed accounts
        if (profile && (profile.role === "fmm" || profile.role === "admin")) {
          if (!profile.cal_access_token) {
            setIsLoading(false);
            return;
          }

          // Check if token is expired
          const expiresAt = profile.cal_token_expires_at ? new Date(profile.cal_token_expires_at) : null;
          const isExpired = expiresAt && expiresAt < new Date();

          if (isExpired) {
            // Refresh the token
            try {
              const { data: refreshData } = await supabase.functions.invoke("cal-refresh-token", {
                headers: {
                  Authorization: `Bearer ${profile.cal_access_token}`,
                },
              });

              if (refreshData?.accessToken) {
                setAccessToken(refreshData.accessToken);
              } else {
                console.error("Failed to refresh Cal.com token");
              }
            } catch (refreshError) {
              console.error("Error refreshing Cal.com token:", refreshError);
            }
          } else {
            setAccessToken(profile.cal_access_token);
          }
        }
      } catch (error) {
        console.error("Error fetching Cal.com access token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserToken();
  }, []);

  const clientId = import.meta.env.VITE_CAL_OAUTH_CLIENT_ID || "";
  const organizationId = import.meta.env.VITE_CAL_ORG_ID;
  const apiUrl = import.meta.env.VITE_CAL_API_URL || "https://api.cal.com/v2";
  const refreshUrl = import.meta.env.VITE_CAL_REFRESH_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cal-refresh-token`;

  // Still loading initial profile data
  if (isLoading) {
    return (
      <CalContext.Provider value={{ isCalReady: false, isLoading: true }}>
        {children}
      </CalContext.Provider>
    );
  }

  // Only render CalAtomsProvider for FMM and Admin users
  const shouldRenderCalProvider = userRole === "fmm" || userRole === "admin";

  if (!shouldRenderCalProvider) {
    return (
      <CalContext.Provider value={{ isCalReady: false, isLoading: false }}>
        {children}
      </CalContext.Provider>
    );
  }

  // Warn if Cal.com configuration is missing
  if (!clientId) {
    console.warn("Cal.com OAuth Client ID is not configured. Calendar integration will not work.");
  }

  // Render CalAtomsProvider for FMM/Admin users, even without token
  // The Atoms will show their own "Connect Google Calendar" flow
  return (
    <CalContext.Provider value={{ isCalReady: !!accessToken, isLoading: false }}>
      <CalAtomsProvider
        accessToken={accessToken || ""}
        clientId={clientId}
        organizationId={organizationId}
        options={{
          apiUrl,
          refreshUrl
        }}
        autoUpdateTimezone={true}
      >
        {children}
      </CalAtomsProvider>
    </CalContext.Provider>
  );
}
