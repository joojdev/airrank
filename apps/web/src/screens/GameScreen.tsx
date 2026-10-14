import {
  advance,
  answer,
  bestKey,
  getMetric,
  startSession,
  type Guess,
  type Item,
  type Selection,
  type Session,
} from "@agg/shared";
import {
  faArrowDown,
  faArrowLeft,
  faArrowUp,
  faCaretDown,
  faCaretUp,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "../components/Confetti";
import { ItemCard } from "../components/ItemCard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useLanguage } from "../i18n";
import { Button } from "../paper";
import { loadBest } from "../storage/storage";

/** Tension before the answer: slot-machine numbers roll, the screen pulses. */
const SUSPENSE_MS = 1500;
const SUSPENSE_REDUCED_MS = 400;
/** How long a reveal stays on screen before moving on. */
const REVEAL_OK_MS = 1900;
const REVEAL_BAD_MS = 2400;
/** Taps or keys right after a reveal are ignored so the result can be seen. */
const MIN_REVEAL_MS = 500;
const SHAKE_MS = 700;
const EXIT_CONFIRM_MS = 3000;

export interface GameResult {
  score: number;
  won: boolean;
}

export function GameScreen({
  items,
  selection,
  onEnd,
  onEmpty,
  onExit,
}: {
  items: Item[];
  selection: Selection;
  onEnd: (result: GameResult) => void;
  onEmpty: () => void;
  onExit: () => void;
}) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [session, setSession] = useState<Session | null>(() =>
    startSession(items, selection, Math.random),
  );
  const [pending, setPending] = useState<Guess | null>(null);
  const [burst, setBurst] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [best] = useState(() => loadBest()[bestKey(selection)] ?? 0);
  const proceeded = useRef(false);
  const revealedAt = useRef(0);
  const timers = useRef<number[]>([]);
  const metric = getMetric(selection.metric);

  const range = useMemo<[number, number]>(() => {
    const values = (session?.pool ?? [])
      .map((i) => i.metrics[selection.metric])
      .filter((v): v is number => v !== undefined);
    return [Math.min(...values), Math.max(...values)];
  }, [selection.metric, session?.pool]);

  useEffect(() => {
    if (!session) onEmpty();
  }, [session, onEmpty]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const phase = session?.phase;
  const proceed = useCallback(() => {
    if (proceeded.current || !session) return;
    if (performance.now() - revealedAt.current < MIN_REVEAL_MS) return;
    proceeded.current = true;
    if (session.phase === "revealing") setSession(advance(session, Math.random));
    else if (session.phase === "over") onEnd({ score: session.score, won: session.won });
  }, [session, onEnd]);

  const guess = useCallback(
    (g: Guess) => {
      if (!session || session.phase !== "answering" || pending) return;
      setConfirmingExit(false);
      setPending(g);
      later(
        () => {
          const next = answer(session, g);
          revealedAt.current = performance.now();
          setSession(next);
          setPending(null);
          if (next.lastCorrect) {
            if (!reducedMotion) setBurst((n) => n + 1);
          } else if (!reducedMotion) {
            setShaking(true);
            later(() => setShaking(false), SHAKE_MS);
          }
        },
        reducedMotion ? SUSPENSE_REDUCED_MS : SUSPENSE_MS,
      );
    },
    [session, pending, reducedMotion],
  );

  useEffect(() => {
    if (!phase || phase === "answering") {
      proceeded.current = false;
      return;
    }
    const timer = setTimeout(proceed, phase === "over" ? REVEAL_BAD_MS : REVEAL_OK_MS);
    const onKey = () => proceed();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, proceed]);

  useEffect(() => {
    if (phase !== "answering" || pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") guess("higher");
      else if (e.key === "ArrowDown") guess("lower");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pending, guess]);

  const onExitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmingExit) {
      setConfirmingExit(true);
      later(() => setConfirmingExit(false), EXIT_CONFIRM_MS);
      return;
    }
    onExit();
  };

  if (!session) return null;
  const revealing = session.phase !== "answering";
  const suspense = pending !== null;
  const outcome = revealing ? (session.lastCorrect ? "ok" : "bad") : null;
  const streakNote = outcome === "ok" && session.score >= 2;
  const statusText = revealing
    ? `${session.lastCorrect ? t("game.correct") : t("game.wrong")} ${t("game.score")}: ${session.score}`
    : suspense
      ? t("game.drumroll")
      : "";

  const rootClass = [
    "game",
    suspense && "game--suspense",
    outcome && `game--${outcome}`,
    shaking && "game--shake",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} onClick={revealing ? proceed : undefined}>
      <ItemCard
        key={`c-${session.current.id}`}
        item={session.current}
        metric={selection.metric}
        role="current"
        mode="value"
      />
      <ItemCard
        key={`h-${session.challenger.id}`}
        item={session.challenger}
        metric={selection.metric}
        role="challenger"
        mode={revealing ? "value" : suspense ? "rolling" : "hidden"}
        outcome={outcome}
        range={range}
      >
        <div className="answers">
          <Button
            className="answer-btn answer-btn--up"
            variant="sage"
            onClick={() => guess("higher")}
          >
            <span className="answer-btn__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faCaretUp} />
            </span>
            {t(metric.answerLabels.higher as "answer.more")}
            <kbd aria-hidden="true">
              <FontAwesomeIcon icon={faArrowUp} />
            </kbd>
          </Button>
          <Button
            className="answer-btn answer-btn--down"
            variant="primary"
            onClick={() => guess("lower")}
          >
            <span className="answer-btn__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faCaretDown} />
            </span>
            {t(metric.answerLabels.lower as "answer.less")}
            <kbd aria-hidden="true">
              <FontAwesomeIcon icon={faArrowDown} />
            </kbd>
          </Button>
        </div>
      </ItemCard>

      <div
        key={outcome ?? "vs"}
        className={`versus${outcome ? ` versus--${outcome}` : ""}`}
        aria-hidden="true"
      >
        {outcome === "ok" ? (
          <FontAwesomeIcon icon={faCheck} />
        ) : outcome === "bad" ? (
          <FontAwesomeIcon icon={faXmark} />
        ) : (
          t("game.vs")
        )}
      </div>

      <header className="hud">
        <button type="button" className="hud__exit" onClick={onExitClick}>
          {confirmingExit ? (
            t("game.exitConfirm")
          ) : (
            <>
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {t("game.exit")}
            </>
          )}
        </button>
        <div className="hud__score">
          <span className="hud__label">{t("game.score")}</span>
          <strong key={session.score} className="hud__points">
            {session.score}
          </strong>
          <span className="hud__best">
            {t("game.best")}: {Math.max(best, session.score)}
          </span>
        </div>
      </header>

      {outcome && (
        <div key={`r-${session.score}-${outcome}`} className={`verdict verdict--${outcome}`}>
          {outcome === "ok" ? t("game.correct") : t("game.wrong")}
          {streakNote && <small>{t("game.streak", { n: session.score })}</small>}
        </div>
      )}
      {suspense && <div className="drumroll" aria-hidden="true" />}
      {revealing && (
        <p className="reveal-hint" aria-hidden="true">
          {t("game.skip")}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="assertive">
        {statusText}
      </p>
      <Confetti burst={burst} amount={90 + Math.min(session.score, 10) * 14} />
    </div>
  );
}
