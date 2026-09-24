import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/components/home-page";
import { AppToaster } from "@/components/app-toaster";

export function App() {
  return (
    <>
      <AppToaster />
      <Routes>
        {/* Shared-link URLs like /:slug/:id are handled inside HomePage itself. */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
