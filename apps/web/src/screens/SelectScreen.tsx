import {
  DifficultySchema,
  defaultMetric,
  isSelectionValid,
  metricsFor,
  type Category,
  type Difficulty,
  type Manifest,
  type MetricId,
  type Selection,
} from "@agg/shared";
import { faCheck, faClockRotateLeft, faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, type ReactNode } from "react";
import { useLanguage } from "../i18n";
import { Button } from "../paper";
import { loadSelection, saveSelection } from "../storage/storage";

const CATEGORIES: Category[] = ["airport", "airline"];
const svgProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const CATEGORY_ICON: Record<Category, ReactNode> = {
  airport: (
    <svg {...svgProps}>
      <path d="M9 21V9h6v12M7 9h10l-1-4H8zM12 5V2M5 21h14" />
    </svg>
  ),
  airline: (
    <svg {...svgProps}>
      <path d="M2 16l20-6-2-2-6 1-6-6H5l4 7-4 1-2-2H1l2 4z" />
    </svg>
  ),
};
const DIFFICULTIES = DifficultySchema.options;
const DEFAULT_DIFFICULTY: Difficulty = "medium";

function Choice({
  name,
  value,
  checked,
  disabled,
  onChange,
  icon,
  title,
  hint,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <label className={`choice${checked ? " choice--on" : ""}${disabled ? " choice--off" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {checked && (
        <span className="choice__check" aria-hidden="true">
          <FontAwesomeIcon icon={faCheck} />
        </span>
      )}
      {icon && (
        <span className="choice__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="choice__title">{title}</span>
      {hint && <span className="choice__hint">{hint}</span>}
    </label>
  );
}

export function SelectScreen({
  manifest,
  onStart,
}: {
  manifest: Manifest;
  onStart: (selection: Selection) => void;
}) {
  const { t } = useLanguage();
  const [restored] = useState(() => {
    const stored = loadSelection();
    return stored && isSelectionValid(stored, manifest) ? stored : null;
  });
  const firstAvailable = CATEGORIES.find((c) => metricsFor(c, manifest).length > 0) ?? "airport";
  const [category, setCategory] = useState<Category>(restored?.category ?? firstAvailable);
  const [metric, setMetric] = useState<MetricId | "">(
    restored?.metric ?? defaultMetric(category, manifest) ?? "",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    restored?.difficulty ?? DEFAULT_DIFFICULTY,
  );

  const offered = metricsFor(category, manifest);
  const ready = metric !== "" && offered.includes(metric);

  const chooseCategory = (next: Category) => {
    setCategory(next);
    setMetric(defaultMetric(next, manifest) ?? metricsFor(next, manifest)[0] ?? "");
  };

  const start = () => {
    if (!ready) return;
    const selection: Selection = { category, metric, difficulty };
    saveSelection(selection);
    onStart(selection);
  };

  return (
    <form
      className="select"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <section className="select__intro">
        <p className="select__tagline">{t("app.tagline")}</p>
        <p className="muted select__how">{t("select.how")}</p>
        {restored && (
          <p className="select__restored">
            <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" /> {t("select.last")}
          </p>
        )}
      </section>

      <div className="select__row">
        <fieldset className="select__group">
          <legend>
            <span className="select__step">1</span> {t("select.category")}
          </legend>
          <div className="choices choices--two">
            {CATEGORIES.map((c) => {
              const available = metricsFor(c, manifest).length > 0;
              return (
                <Choice
                  key={c}
                  name="category"
                  value={c}
                  checked={category === c}
                  disabled={!available}
                  onChange={() => chooseCategory(c)}
                  icon={CATEGORY_ICON[c]}
                  title={t(`category.${c}` as const)}
                  hint={available ? undefined : t("select.unavailable")}
                />
              );
            })}
          </div>
        </fieldset>

        <fieldset className="select__group">
          <legend>
            <span className="select__step">2</span> {t("select.metric")}
          </legend>
          <div className="choices">
            {offered.map((m) => (
              <Choice
                key={m}
                name="metric"
                value={m}
                checked={metric === m}
                onChange={() => setMetric(m)}
                title={t(`metric.${m}` as const)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="select__group">
        <legend>
          <span className="select__step">3</span> {t("select.difficulty")}
        </legend>
        <div className="choices choices--three">
          {DIFFICULTIES.map((d) => (
            <Choice
              key={d}
              name="difficulty"
              value={d}
              checked={difficulty === d}
              onChange={() => setDifficulty(d)}
              title={t(`difficulty.${d}` as const)}
              hint={t(`select.hint.${d}` as const)}
            />
          ))}
        </div>
      </fieldset>

      {!ready && <p role="alert">{t("select.tooFew")}</p>}
      <Button type="submit" variant="primary" className="select__start" disabled={!ready}>
        <FontAwesomeIcon icon={faPlay} aria-hidden="true" /> {t("select.start")}
      </Button>
    </form>
  );
}
