import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { toJevPrompt, getJevResponse, type DecisionResult } from '@/lib/sendPrompts';
import { ErrorBoundary } from '@/components/error-boundary';
import { EightBallArt } from '@/components/eight-ball-art';
import { PlayfulBall } from '@/components/playful-ball';
import { PlayfulBrand } from '@/components/playful-brand';
import { InfoTip } from '@/components/info-tip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const MAX_CHARS = 4000;
type Stage = 'idle' | 'preparing' | 'asking' | 'done' | 'error';
const pct = (n: number) => Math.round(n * 1000) / 10;

function EightBall() {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);
  useEffect(() => () => abortRef.current?.abort(), []);
  const busy = stage === 'preparing' || stage === 'asking';

  const submit = async () => {
    if (busyRef.current) return;
    const q = input.trim();
    setResult(null);
    if (!q || q.length > MAX_CHARS) {
      setError(!q ? 'Type a question first.' : `Keep it under ${MAX_CHARS} characters.`);
      setStage('error');
      return;
    }
    busyRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(''); setStage('preparing');
    try {
      const prepared = await toJevPrompt(q, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setStage('asking');
      const answer = await getJevResponse(prepared, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResult(answer); setStage('done');
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setStage('error');
    } finally { busyRef.current = false; }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault(); void submit();
    }
  };
  const orbText = busy ? '...' : result?.answer ?? '8';
  const rounds = result?.researchRounds ?? 0;
  const isChoiceAnswer = !busy && result?.type === 'choice';
  const status = stage === 'preparing' ? 'Preparing context…'
    : stage === 'asking' ? 'Asking Jev…'
    : stage === 'error' ? error
    : result ? result.type === 'noul'
      ? `${result.answer} · ${pct(result.probability!)}% probability of yes`
      : result.answer : '';

  return (
    <main className="page-shell">
      <PlayfulBrand />
      <section className={`main-stage${result ? ' has-result' : ''}`} aria-label="Ask a question">
        <div className={`orb${busy ? ' is-busy' : ''}`}>
          <PlayfulBall label={`Eight ball: ${result?.answer ?? (busy ? 'thinking' : 'waiting for a question')}`}>
          <EightBallArt />
          <span
            className={`orb-answer${!result && !busy ? ' is-eight' : ''}${isChoiceAnswer ? ' is-choice' : ''}`}
            style={isChoiceAnswer ? { fontSize: `clamp(4px, ${Math.min(5, 28 / Math.sqrt(Math.max(1, orbText.length)))}cqw, 16px)` } : undefined}
            aria-hidden="true"
          >{orbText}</span>
          </PlayfulBall>
        </div>
        <div className={`readout${result ? ' is-in' : ''}`} key={result ? 'r' : 'e'}>
          <p className={`status${stage === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">{status}</p>
          {result?.question && (
            <div className="asked-row">
              <p className="asked">{result.question}</p>
              <InfoTip label="About this question">This is the question sent to Jev — prepared from your input with added context, not your exact words.</InfoTip>
            </div>
          )}
          {rounds > 0 && <p className="rounds">{rounds} {rounds === 1 ? 'round' : 'rounds'} of research done</p>}
          {!!result?.options.length && (
            <ul className="bars" aria-label="Option weights">
              {result.options.map(option => {
                const weight = pct(option.weight);
                return (
                  <li key={option.key} className={`bar${option.label === result.answer ? ' is-chosen' : ''}`}>
                    <div className="bar-head">
                      <span className="bar-label">{option.label}</span>
                      <span className="bar-pct">{weight}%</span>
                    </div>
                    <div className="bar-track" role="meter" aria-label={option.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={weight}>
                      <div className="bar-fill" style={{ transform: `scaleX(${option.weight})` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <form className="prompt-frame" onSubmit={e => { e.preventDefault(); void submit(); }}>
          <label className="sr-only" htmlFor="question">Your question</label>
          <div className="prompt-content">
            <textarea id="question" className="prompt" data-testid="input-question" placeholder="Ask a question" rows={2}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              aria-invalid={input.length > MAX_CHARS || undefined} aria-describedby="char-count" />
            <button className="prompt-send" type="submit" aria-label={stage === 'error' ? 'Retry question' : 'Send question'} disabled={busy}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3 8l5-5 5 5" /></svg>
            </button>
          </div>
          <div id="char-count" className={`char-count${input.length > MAX_CHARS ? ' is-over' : ''}`}>
            {input.length > MAX_CHARS * .8 ? `${input.length} / ${MAX_CHARS}` : ''}
          </div>
        </form>
      </section>
      <section className="desktop-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">FAQ</h2>
        <div className="faq-grid">
          <article className="faq-item" data-testid="faq-jev">
            <h3>What is Jev?</h3>
            <p>Jev is the decision engine behind 8Ball. It weighs choices or estimates the likelihood of a yes-or-no outcome.</p>
          </article>
          <article className="faq-item" data-testid="faq-process">
            <h3>How does it work?</h3>
            <p>Claude turns your question into a clear prompt for Jev. When useful, it can add context with a round of web research.</p>
          </article>
          <article className="faq-item" data-testid="faq-results">
            <h3>How should I read the result?</h3>
            <p>For choices, the bars show Jev’s relative weighting for each option. Yes-or-no answers include an estimated probability of yes.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={EightBall} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </WouterRouter>
  );
}
