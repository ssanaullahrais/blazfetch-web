import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { PWA_ENABLED, removeServiceWorkers } from "@/lib/pwa"
import { startInstallListener } from "@/lib/pwa-install"

// A build with the PWA switched off cleans up whatever an earlier, installable build left in this browser.
if (!PWA_ENABLED) void removeServiceWorkers()
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
