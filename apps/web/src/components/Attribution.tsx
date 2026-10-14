import type { Photo } from "@agg/shared";
import { useLanguage } from "../i18n";

export function Attribution({ photo }: { photo: Photo }) {
  const { t } = useLanguage();
  return (
    <p className="attribution">
      {t("photo.by")} {photo.author} ·{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer noopener">
        {t("photo.license")}: {photo.license}
      </a>
    </p>
  );
}
