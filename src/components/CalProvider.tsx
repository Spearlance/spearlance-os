import { ReactNode, useEffect, useState } from "react";
import { CalProvider as CalAtomsProvider } from "@calcom/atoms";
import "@calcom/atoms/globals.min.css";
import { supabase } from "@/integrations/supabase/client";

interface CalProviderProps {
  children: ReactNode;
}

export function CalProvider({ children }: CalProviderProps) {
  const [accessToken, setAccessToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
          .select("cal_access_token, role")
          .eq("id", user.id)
          .single();

        // Only provide access token for FMM and Admin users who have managed accounts
        if (profile && (profile.role === "fmm" || profile.role === "admin") && profile.cal_access_token) {
          setAccessToken(profile.cal_access_token);
        }
      } catch (error) {
        console.error("Error fetching Cal.com access token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserToken();
  }, []);

  // Don't render Cal provider if still loading or no token
  if (isLoading || !accessToken) {
    return <>{children}</>;
  }

  const clientId = import.meta.env.VITE_CAL_OAUTH_CLIENT_ID || "";
  const apiUrl = import.meta.env.VITE_CAL_API_URL || "https://api.cal.com/v2";
  const refreshUrl = import.meta.env.VITE_CAL_REFRESH_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cal-refresh-token`;

  return (
    <CalAtomsProvider
      accessToken={accessToken}
      clientId={clientId}
      options={{
        apiUrl,
        refreshUrl
      }}
      autoUpdateTimezone={true}
    >
      {children}
    </CalAtomsProvider>
  );
}
