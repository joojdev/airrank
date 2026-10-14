import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLanguage } from "../i18n";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="app-footer">
      <a href="https://piovezan.dev.br" target="_blank" rel="noopener noreferrer">
        {t("footer.about")} <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
      </a>
    </footer>
  );
}
