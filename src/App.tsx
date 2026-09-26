import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/components/home-page";
import { MediaLogsPage } from "@/components/media-logs-page";
import { AppToaster } from "@/components/app-toaster";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { InstallToast } from "@/components/install-app";
import { PWA_ENABLED_ON_DEVICE } from "@/lib/pwa";

export function App() {
  return (
    <>
      <AppToaster />
      {PWA_ENABLED_ON_DEVICE && <PwaUpdatePrompt />}
      {PWA_ENABLED_ON_DEVICE && <InstallToast />}
      <Routes>
        <Route path="/:platform/:id/logs" element={<MediaLogsPage />} />
        {/* Shared-link URLs like /:slug/:id are handled inside HomePage itself. */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
