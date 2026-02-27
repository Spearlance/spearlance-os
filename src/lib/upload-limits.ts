export const UPLOAD_LIMITS = {
  LOGO: 5 * 1024 * 1024,
  GENERAL: 10 * 1024 * 1024,
  VIDEO: 25 * 1024 * 1024,
  ASSET: 50 * 1024 * 1024,
  formatMB: (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`,
} as const;
