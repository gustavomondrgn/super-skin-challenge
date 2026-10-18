import { lazy, Suspense } from "react";
import PublicPage from "./PublicPage";
import { useTournament } from "./useTournament";

const AdminPage = lazy(() => import("./AdminPage"));

export default function App() {
  const event = useTournament();
  if (window.location.pathname.replace(/\/$/, "") === "/admin")
    return (
      <Suspense
        fallback={
          <main className="loading-page" aria-live="polite">
            Abrindo painel…
          </main>
        }
      >
        <AdminPage {...event} />
      </Suspense>
    );
  return (
    <PublicPage
      state={event.state}
      connection={event.connection}
      lastUpdated={event.lastUpdated}
      error={event.error}
      onRetry={() => void event.refresh()}
    />
  );
}
