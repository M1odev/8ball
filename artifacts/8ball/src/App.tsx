import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

function EightBall() {
  return (
    <main className="page-shell">
      <header className="brand" aria-label="8ball">
        8BALL
      </header>

      <section className="main-stage" aria-label="Ask a question">
        <div className="orb" role="img" aria-label="Eight ball showing the static answer yes">
          <div className="orb-window">
            <span className="orb-answer">YES</span>
          </div>
          <div className="orb-band" aria-hidden="true" />
        </div>
        <label className="sr-only" htmlFor="question">Your question</label>
        <textarea
          id="question"
          className="prompt"
          data-testid="input-question"
          placeholder="Ask a question"
          rows={2}
        />
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
