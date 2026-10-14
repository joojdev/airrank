import { useLanguage } from "../i18n";
import { Button, Window } from "../paper";

export function ErrorScreen({ kind, onRetry }: { kind: "load" | "empty"; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <Window title={t("error.title")}>
      <div className="stack">
        <p role="alert">{kind === "load" ? t("error.dataLoad") : t("error.empty")}</p>
        <Button variant="primary" onClick={onRetry}>
          {t("error.retry")}
        </Button>
      </div>
    </Window>
  );
}
