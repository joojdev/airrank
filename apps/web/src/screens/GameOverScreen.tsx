import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { bestKey, updateBest, type Selection } from "@agg/shared";
import { useEffect, useState } from "react";
import { Confetti } from "../components/Confetti";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useLanguage } from "../i18n";
import { Button, Icon, Window } from "../paper";
import { buildShareText, share, type ShareResult } from "../share/share";
import { loadBest, saveBest } from "../storage/storage";
import type { GameResult } from "./GameScreen";

export function GameOverScreen({
  selection,
  result,
  onReplay,
  onRestart,
}: {
  selection: Selection;
  result: GameResult;
  onReplay: () => void;
  onRestart: () => void;
}) {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [previousBest] = useState(() => loadBest()[bestKey(selection)] ?? 0);
  const [best, setBest] = useState(previousBest);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const isRecord = result.score > previousBest;

  useEffect(() => {
    const all = loadBest();
    const updated = updateBest(all, bestKey(selection), result.score);
    if (updated !== all) saveBest(updated);
    setBest(updated[bestKey(selection)] ?? 0);
  }, [selection, result.score]);

  const onShare = async () => {
    setShareResult(await share(buildShareText(result.score, selection, language)));
  };

  return (
    <div className="over">
      <Window title={result.won ? t("over.won") : t("over.lost")} className="over__card">
        <div className="stack">
          {isRecord && (
            <p className="over__record">
              <FontAwesomeIcon icon={faStar} aria-hidden="true" /> {t("over.record")}
            </p>
          )}
          <p className="over__score">
            <span className="muted">{t("over.score")}</span>
            <strong>{result.score}</strong>
          </p>
          <p className="over__best">
            {t("over.best")}: <strong>{best}</strong>
          </p>
          <div className="over__actions">
            <Button variant="primary" className="over__replay" onClick={onReplay} autoFocus>
              <Icon name="restart" /> {t("over.replay")}
            </Button>
            <Button variant="sage" onClick={onShare}>
              <Icon name="share" /> {t("over.share")}
            </Button>
            <Button onClick={onRestart}>{t("over.restart")}</Button>
          </div>
          <p role="status" aria-live="polite">
            {shareResult === "copied" && t("over.copied")}
            {shareResult === "failed" && t("over.shareFailed")}
          </p>
        </div>
      </Window>
      {(isRecord || result.won) && !reducedMotion && <Confetti burst={1} amount={220} />}
    </div>
  );
}
