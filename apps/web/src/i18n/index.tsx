import type { Language } from "@agg/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadLanguage, saveLanguage } from "../storage/storage";
import { detectLanguage } from "./detect";
import { en } from "./en";
import { ptBR, type DictionaryKey } from "./pt-BR";

const dictionaries: Record<Language, Record<DictionaryKey, string>> = { "pt-BR": ptBR, en };

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: DictionaryKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    detectLanguage(typeof navigator === "undefined" ? [] : navigator.languages, loadLanguage()),
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        saveLanguage(next);
      },
      t: (key, params) => {
        let text = dictionaries[language][key];
        for (const [name, v] of Object.entries(params ?? {}))
          text = text.replace(`{${name}}`, String(v));
        return text;
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export { dictionaries };
export type { DictionaryKey };
