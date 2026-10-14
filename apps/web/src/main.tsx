import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyStoredTheme } from "./components/ThemeToggle";
import { LanguageProvider } from "./i18n";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/game.css";
import "./styles/screens.css";

applyStoredTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
