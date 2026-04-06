import type { Session } from "@supabase/supabase-js";

export const getHashParams = () =>
  new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);

export const hasRecoveryTokensInHash = () => {
  const hashParams = getHashParams();
  return Boolean(hashParams.get("access_token") || hashParams.get("refresh_token") || hashParams.get("code"));
};

export const getRecoveryError = () => {
  const hashParams = getHashParams();
  const error = hashParams.get("error");
  const description = hashParams.get("error_description");
  if (!error && !description) {
    return null;
  }

  return {
    error,
    description,
  };
};

export const hasUsableRecoverySession = (session: Session | null) =>
  Boolean(session?.user && session?.access_token);
