export interface Language {
  code: string;
  label: string;
  rtl?: boolean;
}

// "en" = English, the source (no translation). Radix Select forbids an
// empty-string value, so English needs a real code. The target-language codes
// match the translate-article edge function.
export const SOURCE_LANG = "en";

export const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
  { code: "es", label: "Spanish" },
  { code: "ur", label: "Urdu", rtl: true },
  { code: "hi", label: "Hindi" },
];

export const LANGUAGE_STORAGE_KEY = "sopReaderLang";

/** True when the code names an actual translation target (not English). */
export function isTranslatable(code: string): boolean {
  return !!code && code !== SOURCE_LANG;
}

export function isRtlLang(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}
