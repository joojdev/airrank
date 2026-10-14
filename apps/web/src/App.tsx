import type { Item, Manifest, Selection } from "@agg/shared";
import { faPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useState } from "react";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ThemeToggle } from "./components/ThemeToggle";
import { loadItems, loadManifest } from "./data/loader";
import { useLanguage } from "./i18n";
import { ErrorScreen } from "./screens/ErrorScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { GameScreen, type GameResult } from "./screens/GameScreen";
import { SelectScreen } from "./screens/SelectScreen";

type State =
  | { screen: "loading" }
  | { screen: "error"; kind: "load" | "empty" }
  | { screen: "select" }
  | { screen: "game"; selection: Selection; items: Item[] }
  | { screen: "over"; selection: Selection; items: Item[]; result: GameResult };

export function App() {
  const { t } = useLanguage();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [state, setState] = useState<State>({ screen: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ screen: "loading" });
    loadManifest()
      .then((m) => {
        if (cancelled) return;
        setManifest(m);
        setState(m.metrics.length ? { screen: "select" } : { screen: "error", kind: "empty" });
      })
      .catch(() => !cancelled && setState({ screen: "error", kind: "load" }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const start = async (selection: Selection) => {
    if (!manifest) return;
    try {
      setState({ screen: "game", selection, items: await loadItems(selection.category, manifest) });
    } catch {
      setState({ screen: "error", kind: "load" });
    }
  };
  const replay = (selection: Selection, items: Item[]) =>
    setState({ screen: "game", selection, items });
  const onEmpty = useCallback(() => setState({ screen: "error", kind: "empty" }), []);
  const retry = () => setAttempt((n) => n + 1);

  const playing = state.screen === "game";

  return (
    <div className={playing ? "app app--game" : "app"}>
      {!playing && (
        <header className="app-header">
          <h1>
            <FontAwesomeIcon icon={faPlane} aria-hidden="true" /> {t("app.title")}
          </h1>
          <div className="app-header__controls">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
      )}
      <main>
        {state.screen === "loading" && (
          <p role="status" className="loading">
            <span className="loading__plane" aria-hidden="true">
              <FontAwesomeIcon icon={faPlane} />
            </span>
            {t("loading")}…
          </p>
        )}
        {state.screen === "error" && <ErrorScreen kind={state.kind} onRetry={retry} />}
        {state.screen === "select" && manifest && (
          <SelectScreen manifest={manifest} onStart={start} />
        )}
        {state.screen === "game" && (
          <GameScreen
            items={state.items}
            selection={state.selection}
            onEmpty={onEmpty}
            onExit={() => setState({ screen: "select" })}
            onEnd={(result) =>
              setState({ screen: "over", selection: state.selection, items: state.items, result })
            }
          />
        )}
        {state.screen === "over" && (
          <GameOverScreen
            selection={state.selection}
            result={state.result}
            onReplay={() => replay(state.selection, state.items)}
            onRestart={() => setState({ screen: "select" })}
          />
        )}
      </main>
    </div>
  );
}
