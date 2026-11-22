import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "@fontsource-variable/inter/index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/reader.css";
import { router } from "./app/router";
import { registerPwa } from "./app/pwa";
import { captureInstallPrompt } from "./app/install";
import { queryClient, persister, PERSIST_MAX_AGE, shouldPersist } from "./lib/query";
import { initUser } from "./lib/store/user";
import { startIntel } from "./lib/intel/runtime";
import { applyTheme, loadSettings } from "./lib/settings";
import { initPlatform } from "./lib/platform";
import { storageReady } from "./lib/store/db";

applyTheme();
// before anything awaits: Chromium fires beforeinstallprompt early and only once
captureInstallPrompt();

async function boot() {
  await storageReady();
  await Promise.all([initUser(), loadSettings()]);
  startIntel();
  void initPlatform({
    navigateBack: () => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) {
        void router.navigate(-1);
        return true;
      }
      if (location.pathname !== "/") {
        void router.navigate("/", { replace: true });
        return true;
      }
      return false;
    },
    openUrl: (path) => void router.navigate(path),
  });
  void registerPwa();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: "v1", dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && shouldPersist(q.queryKey) } }}>
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

void boot();
