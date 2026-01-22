import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PasswordGate } from "@/components/public-assets/PasswordGate";
import { PublicAssetManager } from "@/components/public-assets/PublicAssetManager";

export default function PublicAssets() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<{ token: string; clientName: string } | null>(null);

  // Check for existing session in sessionStorage
  useEffect(() => {
    if (token) {
      const stored = sessionStorage.getItem(`asset_share_${token}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Check if session is still valid (not expired)
          if (parsed.expiresAt > Date.now()) {
            setSession({ token: parsed.sessionToken, clientName: parsed.clientName });
          } else {
            sessionStorage.removeItem(`asset_share_${token}`);
          }
        } catch {
          sessionStorage.removeItem(`asset_share_${token}`);
        }
      }
    }
  }, [token]);

  const handleAuthenticated = (sessionToken: string, clientName: string, expiresIn: number) => {
    const expiresAt = Date.now() + (expiresIn * 1000);
    sessionStorage.setItem(`asset_share_${token}`, JSON.stringify({
      sessionToken,
      clientName,
      expiresAt
    }));
    setSession({ token: sessionToken, clientName });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid share link</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>{session?.clientName ? `${session.clientName} Assets` : 'Asset Portal'}</title>
      </Helmet>
      
      {!session ? (
        <PasswordGate 
          shareToken={token} 
          onAuthenticated={handleAuthenticated} 
        />
      ) : (
        <PublicAssetManager 
          sessionToken={session.token} 
          clientName={session.clientName} 
        />
      )}
    </>
  );
}
