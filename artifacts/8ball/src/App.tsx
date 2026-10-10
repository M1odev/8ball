import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function EightBall() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-lockup" data-testid="text-brand">
          <span className="brand-mark" aria-hidden="true">8</span>
          <span>Jev’s question desk</span>
        </div>
        <div className="top-meta" aria-label="A personal decision object">
          <span className="signal">On the table</span>
          <span className="edition">One of one&nbsp; / &nbsp;8B—01</span>
        </div>
      </header>

      <section className="main-stage" aria-labelledby="page-title">
        <p className="eyebrow">A small instrument for the undecided</p>
        <h1 className="hero-heading" id="page-title">
          Ask it <em>anything.</em>
        </h1>
        <p className="subheading">No ceremony required. Just you and the question.</p>

        <div className="orb-wrap" role="img" aria-label="A pixel-art black eight ball with the answer Yes inside">
          <svg className="orb-svg" viewBox="0 0 320 320" aria-hidden="true">
            <circle className="orb-shadow" cx="160" cy="165" r="130" />
            <circle className="orb-edge" cx="160" cy="156" r="128" />
            <circle className="orb-body" cx="160" cy="154" r="124" />
            <path className="orb-facet" d="M160 30a124 124 0 0 1 112 71l-31 17a89 89 0 0 0-81-51z" />
            <path className="orb-facet" d="M38 155a122 122 0 0 0 26 74l23-26a89 89 0 0 1-16-49z" />
            <path className="orb-glint" d="M71 79q26-36 63-44l5 8q-37 11-59 42z" />
            <circle className="orb-window" cx="160" cy="154" r="58" />
            <circle className="orb-window-edge" cx="160" cy="154" r="60" />
            <path className="orb-streak" d="M37 145l47-3m-44 9 46-7m-45 13 45-9m-43 14 42-8m119-10 38-5m-37 11 40-6m-37 12 39-6m-37 12 38-7" />
            <path className="orb-streak-thin" d="M37 151l48-10m-43 22 41-12m-37 18 39-14m111-9 43-9m-42 16 41-10m-38 18 40-12" />
          </svg>
          <div className="orb-copy"><span>Yes</span></div>
        </div>

        <div className="prompt-area">
          <label className="prompt-label" htmlFor="question">
            <span>Leave a question with the oracle</span>
            <span>Optional</span>
          </label>
          <div className="prompt-box">
            <textarea
              id="question"
              data-testid="input-question"
              placeholder="Should I take the long way home?"
              aria-describedby="prompt-note"
            />
          </div>
          <p className="prompt-note" id="prompt-note">
            <span>Just a place to put the thought.</span>
            <span>Nothing is sent</span>
          </p>
        </div>
      </section>

      <footer className="footer-line">
        <span>A desk for the undecided</span>
        <span className="footer-right">
          <svg className="footer-star" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2m0-9.2-9.2 9.2" stroke="currentColor" strokeWidth="1" />
          </svg>
          An object for the in-between
        </span>
      </footer>
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
