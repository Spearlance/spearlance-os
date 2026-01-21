import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ApiErrorType = 
  | 'openai_quota' 
  | 'rate_limit' 
  | 'auth_failure' 
  | 'network_error' 
  | 'validation_error'
  | 'unknown';

interface LogApiErrorParams {
  functionName: string;
  errorMessage: string;
  errorType?: ApiErrorType;
  clientId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export const logApiError = async ({
  functionName,
  errorMessage,
  errorType = 'unknown',
  clientId,
  metadata = {}
}: LogApiErrorParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('api_error_logs').insert([{
      function_name: functionName,
      error_message: errorMessage,
      error_type: errorType,
      client_id: clientId || null,
      user_id: user?.id || null,
      metadata: metadata as Json
    }]);
  } catch (err) {
    // Silently fail - don't break the app if error logging fails
    console.error('Failed to log API error:', err);
  }
};

export const isQuotaError = (error: string): boolean => {
  const quotaPatterns = [
    'rate limit',
    'quota',
    '429',
    'exceeded',
    'insufficient_quota',
    'billing'
  ];
  const lowerError = error.toLowerCase();
  return quotaPatterns.some(pattern => lowerError.includes(pattern));
};
