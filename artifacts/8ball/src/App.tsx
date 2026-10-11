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
          <svg className="orb-art" viewBox="0 0 256 256" shapeRendering="crispEdges" aria-hidden="true">
            <circle className="orb-silhouette" cx="128" cy="128" r="126" />
            <circle className="orb-window" cx="128" cy="128" r="59" />
            <rect className="orb-band" x="0" y="110" width="256" height="36" />
            <path className="orb-band-outline" d="M3 110H72 M184 110H253 M3 146H72 M184 146H253" />
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
            <button className="prompt-send" type="button" aria-label="Send question">
              <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M6 15V8H3V6H5V4H7V2H9V4H11V6H13V8H10V15Z" />
              </svg>
            </button>
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
