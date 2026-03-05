/**
 * Input sanitization utilities for chat-assistant.
 * Extracted from index.ts lines 53–116.
 */

/**
 * Masks emails and phone numbers for non-admin users and removes
 * internal-only fields from data rows.
 */
export function redactForRole(data: any[], userRole: string): any[] {
  if (userRole === 'admin' || userRole === 'fmm') {
    return data; // Full access
  }

  // Client users get redacted data
  return data.map(item => {
    const redacted = { ...item };

    // Mask emails
    if (redacted.email) {
      const [local, domain] = redacted.email.split('@');
      redacted.email = `${local[0]}***@${domain}`;
    }

    // Mask phone numbers
    if (redacted.phone) {
      const parts = redacted.phone.replace(/\D/g, '');
      redacted.phone = `(***) ***-${parts.slice(-4)}`;
    }

    // Hide internal notes and sensitive fields
    delete redacted.internal_notes;
    delete redacted.activity_log;

    return redacted;
  });
}

/**
 * Neutralizes prompt injection attempts embedded in user-supplied data
 * before it is included in an LLM prompt.
 */
export function sanitizeDataForPrompt(data: any): any {
  const sensitivePatterns = [
    /ignore previous instructions/gi,
    /disregard all rules/gi,
    /you are now/gi,
    /system prompt/gi,
    /forget everything/gi,
    /new instructions:/gi,
  ];

  const sanitize = (text: string): string => {
    let clean = text;
    sensitivePatterns.forEach(pattern => {
      clean = clean.replace(pattern, '[REDACTED]');
    });
    return clean;
  };

  if (typeof data === 'string') return sanitize(data);

  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForPrompt(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const key in data) {
      sanitized[key] = sanitizeDataForPrompt(data[key]);
    }
    return sanitized;
  }

  return data;
}
