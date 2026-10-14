import type { Item, MetricId } from "@agg/shared";
import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "../i18n";
import { Attribution } from "./Attribution";
import { formatValue } from "./formatValue";

export type ValueMode = "value" | "rolling" | "hidden";

interface Props {
  item: Item;
  metric: MetricId;
  role: "current" | "challenger";
  mode: ValueMode;
  /** Colors the value after a reveal. */
  outcome?: "ok" | "bad" | null;
  /** Range the slot-machine numbers are drawn from while `mode` is "rolling". */
  range?: [number, number];
  /** Rendered in place of the hidden value (the answer buttons). */
  children?: ReactNode;
}

const imgBase = (): string => import.meta.env.BASE_URL ?? "/";

function randomInRange([min, max]: [number, number], metric: MetricId): number {
  if (metric === "founded" || min <= 0) return Math.round(min + Math.random() * (max - min));
  return Math.round(Math.exp(Math.log(min) + Math.random() * (Math.log(max) - Math.log(min))));
}

function RollingNumber({ metric, range }: { metric: MetricId; range: [number, number] }) {
  const { language } = useLanguage();
  const [value, setValue] = useState(() => randomInRange(range, metric));
  useEffect(() => {
    const id = setInterval(() => setValue(randomInRange(range, metric)), 60);
    return () => clearInterval(id);
  }, [range, metric]);
  return <span aria-hidden="true">{formatValue(value, metric, language)}</span>;
}

export function ItemCard({ item, metric, role, mode, outcome = null, range, children }: Props) {
  const { t, language } = useLanguage();
  const [failed, setFailed] = useState(false);
  const { photo } = item;
  const value = item.metrics[metric];
  const largest = Math.max(...photo.widths);
  const srcSet = (format: "avif" | "webp") =>
    photo.widths.map((w) => `${imgBase()}img/${item.id}/${w}.${format} ${w}w`).join(", ");
  const sizes = "(min-width: 720px) 50vw, 100vw";
  const showActions = mode === "hidden" && children;

  return (
    <section className={`pane pane--${role}`} aria-label={item.name}>
      {failed ? (
        <div className="pane__placeholder">{t("game.photoMissing")}</div>
      ) : (
        <picture className="pane__photo">
          {photo.formats.includes("avif") && (
            <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
          )}
          <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
          <img
            src={`${imgBase()}img/${item.id}/${largest}.webp`}
            alt=""
            width={photo.width}
            height={photo.height}
            decoding="async"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
      <div className="pane__shade" />
      <div className="pane__content">
        <div className="pane__meta">
          {item.code}
          {item.country ? ` · ${item.country}` : ""}
        </div>
        <h2 className="pane__name">{item.name}</h2>
        <div className="pane__label">{t(`metric.${metric}` as const)}</div>
        {showActions ? (
          children
        ) : (
          <div
            className={`pane__value pane__value--${mode}${outcome ? ` pane__value--${outcome}` : ""}`}
          >
            {mode === "value" && value !== undefined ? (
              formatValue(value, metric, language)
            ) : mode === "rolling" && range ? (
              <RollingNumber metric={metric} range={range} />
            ) : (
              t("game.hidden")
            )}
          </div>
        )}
        <Attribution photo={photo} />
      </div>
    </section>
  );
}
