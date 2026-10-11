import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { EightBallArt } from '@/components/eight-ball-art';
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
          <EightBallArt />
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
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 13V3M3 8l5-5 5 5" />
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
