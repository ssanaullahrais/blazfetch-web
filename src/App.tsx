import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/components/home-page";
import { AppToaster } from "@/components/app-toaster";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { InstallToast } from "@/components/install-app";
import { PWA_ENABLED } from "@/lib/pwa";

export function App() {
  return (
    <>
      <AppToaster />
      {PWA_ENABLED && <PwaUpdatePrompt />}
      {PWA_ENABLED && <InstallToast />}
      <Routes>
        {/* Shared-link URLs like /:slug/:id are handled inside HomePage itself. */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
