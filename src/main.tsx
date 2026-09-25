import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { PWA_ENABLED_ON_DEVICE, removeServiceWorkers } from "@/lib/pwa"
import { startInstallListener } from "@/lib/pwa-install"

// A build with the PWA switched off, or a mobile/tablet visitor, cleans up whatever an earlier, installable
// build left in this browser (e.g. a phone that installed the app before it became desktop-only).
if (!PWA_ENABLED_ON_DEVICE) void removeServiceWorkers()
// The browser offers its install prompt once, early: keep it for the Install app button.
startInstallListener()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
