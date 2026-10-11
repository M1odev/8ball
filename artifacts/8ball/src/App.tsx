import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

function EightBall() {
  return (
    <main className="page-shell">
      <header className="brand" aria-label="8ball">
        8Ball
      </header>

      <section className="main-stage" aria-label="Ask a question">
        <div className="orb" role="img" aria-label="Eight ball showing the static answer yes">
          <svg className="orb-art" viewBox="0 0 64 64" shapeRendering="crispEdges" aria-hidden="true">
            <path
              className="orb-silhouette"
              d="M26 1h12v3h5v4h5v4h4v4h3v4h3v4h3v5h2v6h-2v5h-3v4h-3v4h-3v4h-4v4h-5v4h-5v3H26v-3h-5v-4h-5v-4h-4v-4H9v-4H6v-4H3v-5H1v-6h2v-5h3v-4h3v-4h3v-4h4v-4h5v-4h5z"
            />
            <path className="orb-window" d="M28 14h8v2h4v2h3v3h2v4h2v10h-2v4h-2v3h-3v2h-4v2h-8v-2h-4v-2h-3v-3h-2v-4h-2V25h2v-4h2v-3h3v-2h4z" />
            <rect className="orb-band" x="0" y="28" width="64" height="8" />
            <path className="orb-band-outline" d="M3 28.5H17 M47 28.5H61 M3 35.5H17 M47 35.5H61" />
          </svg>
          <span className="orb-answer" aria-hidden="true">YES</span>
        </div>
        <label className="sr-only" htmlFor="question">Your question</label>
        <div className="prompt-frame">
          <div className="prompt-content">
            <textarea
              id="question"
              className="prompt"
              data-testid="input-question"
              placeholder="Ask a question"
              rows={2}
            />
            <span className="prompt-send" aria-hidden="true">
              <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
                <path d="M1 6h7V3h2v2h2v2h2v2h-2v2h-2v2H8v-3H1z" />
              </svg>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={EightBall} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
