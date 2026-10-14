import type { Language } from "@agg/shared";
import { useLanguage } from "../i18n";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "pt-BR", label: "Português" },
  { value: "en", label: "English" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="field">
      <span className="muted">{t("lang.label")}</span>
      <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
